// Settings › Integrations store: one clientStorage entry per user, validated
// on the way in (zod shape + the screen's field rules) and merged over the
// defaults on the way out. Connection tests are not wired yet, so nothing
// here talks to GitHub, Jira or the AI providers.
import * as z from 'zod/mini'
import type { HandlerMap } from '@shared/bridge'
import {
  INTEGRATIONS_KEY, INTEGRATIONS_MSG, mergeIntegrations, normalizeIntegration, saveRequestSchema, sectionSchemas, validateIntegration,
  type IntegrationId, type IntegrationSettings, type IntegrationValues,
} from '@shared/integrations'
import type { SessionStore } from './session'

export function createIntegrationsHandlers(store: SessionStore): HandlerMap {
  const read = async (): Promise<IntegrationSettings> => mergeIntegrations(await store.get(INTEGRATIONS_KEY))
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
      const first = Object.values(validateIntegration(section, clean))[0]
      if (first) throw new Error(first)
      return serial(async () => {
        await store.set(INTEGRATIONS_KEY, { ...(await read()), [section]: clean })
        return clean
      })
    },
  }
}
