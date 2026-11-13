// Settings › Integrations store: one clientStorage entry per user, validated
// on the way in (zod shape + the screen's field rules) and merged over the
// defaults on the way out. The signed-in brand's managed sections
// (plugin.config.json) are laid over what the person stored on every read;
// only the person's own values are ever written. Nothing here talks to
// GitHub, Jira or the AI providers.
import * as z from 'zod/mini'
import type { HandlerMap } from '@shared/bridge'
import {
  applyManaged, applySettingsFile, blockingErrors, isSecretField, parseSettingsObject, INTEGRATION_IDS, INTEGRATIONS_KEY, INTEGRATIONS_MSG, mergeIntegrations, normalizeIntegration, saveRequestSchema, sectionSchemas, validateIntegration,
  type IntegrationId, type IntegrationSettings, type IntegrationValues,
} from '@shared/integrations'
import { readIntegrations, readManaged, type Brands } from '@shared/integrations/effective'
import type { SessionStore } from './session'

const importRequestSchema = z.object({ file: z.unknown(), keepExisting: z.boolean() })

/** `brands` defaults to plugin.config.json; tests pass their own. */
export function createIntegrationsHandlers(store: SessionStore, brands?: Brands): HandlerMap {
  /** The person's own values: what gets written back. */
  const stored = async (): Promise<IntegrationSettings> => mergeIntegrations(await store.get(INTEGRATIONS_KEY))
  /** What the plugin acts on: stored values with the brand's managed ones on top. */
  const read = (): Promise<IntegrationSettings> => readIntegrations((k) => store.get(k), brands)
  // Saves are read-modify-write of one key; chain them so two sections saved back to back can't drop each other.
  let queue: Promise<unknown> = Promise.resolve()
  const serial = <T>(task: () => Promise<T>): Promise<T> => {
    const run = queue.then(task, task)
    queue = run.catch(() => undefined)
    return run
  }
  return {
    [INTEGRATIONS_MSG.get]: read,
    [INTEGRATIONS_MSG.save]: async (payload: unknown): Promise<IntegrationValues> => {
      const request = z.safeParse(saveRequestSchema, payload)
      if (!request.success) throw new Error('That settings section isn’t recognised.')
      const section: IntegrationId = request.data.section
      const values = z.safeParse(sectionSchemas[section], request.data.values)
      if (!values.success) throw new Error('Some values are missing or too long. Check the fields and try again.')
      const clean = normalizeIntegration(values.data as IntegrationValues<typeof section>, section)
      return serial(async () => {
        const managed = await readManaged((k) => store.get(k), brands)
        const own = await stored()
        // The form sends locked fields back with the brand's values; keep the person's earlier value for those
        // keys instead, so leaving the brand (or the brand changing it) never reveals a frozen copy.
        const lockedKeys = Object.keys(managed?.[section] ?? {}).filter((key) => !isSecretField(section, key))
        const kept = Object.fromEntries(lockedKeys.map((key) => [key, (own[section] as Record<string, unknown>)[key]]))
        const mine = { ...own, [section]: { ...clean, ...kept } }
        // Rules run on what the plugin will act on, so a managed File 1 ID still asks for the person's key.
        const effective = applyManaged(mine, managed)[section]
        const first = Object.values(validateIntegration(section, effective))[0]
        if (first) throw new Error(first)
        await store.set(INTEGRATIONS_KEY, mine)
        return effective
      })
    },
    /**
     * A team setup file, checked again here: the shell's review is a convenience, this is the gate.
     * Writes the person's own values (brand-managed fields stay theirs) and answers with what the plugin now acts on.
     */
    [INTEGRATIONS_MSG.import]: async (payload: unknown): Promise<IntegrationSettings> => {
      const request = z.safeParse(importRequestSchema, payload)
      if (!request.success) throw new Error('That settings file can’t be read.')
      const parsed = parseSettingsObject(request.data.file)
      if (!parsed.ok) throw new Error(parsed.message)
      return serial(async () => {
        const managed = await readManaged((k) => store.get(k), brands)
        const own = await stored()
        const locked = Object.fromEntries(INTEGRATION_IDS.map((id) => [id, Object.keys(managed?.[id] ?? {}).filter((key) => !isSecretField(id, key))]))
        const mine = applySettingsFile(own, parsed.file.sections, { keepExisting: request.data.keepExisting, locked })
        const effective = applyManaged(mine, managed)
        for (const id of INTEGRATION_IDS) {
          if (!parsed.file.sections[id]) continue
          const first = blockingErrors(id, effective[id])[0]
          if (first) throw new Error(first)
        }
        await store.set(INTEGRATIONS_KEY, mine)
        return effective
      })
    },
  }
}
