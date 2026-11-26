// Plugin configuration page state: one editable draft per brand, built from
// plugin.config.json and turned back into the patch the dev server writes.
import { brandTabRows, personaTabIds, type BrandTabConfig, type PluginConfig } from '@shared/config'
import {
  DEFAULT_INTEGRATIONS, INTEGRATION_IDS, PERSONAL_FIELDS, isSecretField, normalizeIntegration, validateIntegration,
  type FieldErrors, type IntegrationId, type IntegrationValues,
} from '@shared/integrations'

export type { FieldValues } from '@shell/integrations/IntegrationField'
import type { FieldValues } from '@shell/integrations/IntegrationField'

export type PersonaTabs = Readonly<Record<string, readonly string[]>>

export interface BrandDraft {
  /** null: no override, each persona keeps its own order with every enabled tab. */
  tabs: readonly BrandTabConfig[] | null
  /** null: every persona keeps its default tabs. A persona present here has this brand's own list. */
  personas: PersonaTabs | null
  /** A section present here is set on this page for everyone; absent, each person fills it in the plugin. */
  managed: Partial<Record<IntegrationId, FieldValues>>
}

export type Drafts = Record<string, BrandDraft>

/** What plugin.config.json says for each brand. */
export function draftsFrom(config: PluginConfig): Drafts {
  return Object.fromEntries(Object.entries(config.brand.brands).map(([id, b]) => [id, {
    tabs: b.tabs ?? null,
    personas: b.personas ?? null,
    managed: { ...(b.integrations as BrandDraft['managed'] | undefined) },
  }]))
}

/** Rows to show: the override, or every tab in config order (all on) when there is none. */
export function tabRows(config: PluginConfig, brandId: string, draft: BrandDraft): readonly BrandTabConfig[] {
  return draft.tabs ?? brandTabRows(config, brandId).map(({ id }) => ({ id, enabled: true }))
}

export function setTabEnabled(rows: readonly BrandTabConfig[], id: string, enabled: boolean): BrandTabConfig[] {
  return rows.map((row) => (row.id === id ? { ...row, enabled } : row))
}

/** The row at `from` moved to index `to` (clamped); the rest keep their order. */
export function moveTab(rows: readonly BrandTabConfig[], from: number, to: number): BrandTabConfig[] {
  const target = Math.max(0, Math.min(rows.length - 1, to))
  if (from === target || from < 0 || from >= rows.length) return [...rows]
  const next = rows.filter((_, i) => i !== from)
  next.splice(target, 0, rows[from]!)
  return next
}

/** A copy of the config with this brand's draft in place, so the page reads it the way the plugin will. */
export function withDraft(config: PluginConfig, brandId: string, draft: BrandDraft): PluginConfig {
  const brand = config.brand.brands[brandId]
  if (!brand) return config
  const { tabs: _tabs, personas: _personas, ...rest } = brand
  const next = {
    ...rest,
    ...(draft.tabs ? { tabs: [...draft.tabs] } : {}),
    ...(draft.personas ? { personas: copyPersonas(draft.personas) } : {}),
  }
  return { ...config, brand: { ...config.brand, brands: { ...config.brand.brands, [brandId]: next } } }
}

const copyPersonas = (personas: PersonaTabs): Record<string, string[]> =>
  Object.fromEntries(Object.entries(personas).map(([id, tabs]) => [id, [...tabs]]))

/**
 * The brand's persona lists with one tab ticked or unticked. Default tabs keep their default
 * order and additions follow, so a persona whose ticks match the defaults again needs no override.
 */
export function setPersonaTab(config: PluginConfig, brandId: string, draft: BrandDraft, personaId: string, tabId: string, on: boolean): PersonaTabs | null {
  const defaults = config.personas[personaId]?.tabs ?? []
  const rank = (id: string) => (defaults.includes(id) ? defaults.indexOf(id) : defaults.length)
  const others = personaTabIds(withDraft(config, brandId, draft), personaId, brandId).filter((id) => id !== tabId)
  const tabs = (on ? [...others, tabId] : others).sort((a, b) => rank(a) - rank(b))
  const { [personaId]: _previous, ...rest } = draft.personas ?? {}
  const next = tabs.join() === defaults.join() ? rest : { ...rest, [personaId]: tabs }
  return Object.keys(next).length ? next : null
}

/** A section's first-run values without its keys and tokens: what "Set here" starts from. */
export function managedDefaults(section: IntegrationId): FieldValues {
  return withoutSecrets(section, DEFAULT_INTEGRATIONS[section] as FieldValues)
}

/** Keys and each person's own fields (who signed in): never set by a brand. */
const personOnly = (section: IntegrationId, key: string): boolean => isSecretField(section, key) || (PERSONAL_FIELDS[section] ?? []).includes(key)

export function withoutSecrets(section: IntegrationId, values: FieldValues): FieldValues {
  return Object.fromEntries(Object.entries(values).filter(([key]) => !personOnly(section, key)))
}

/** Field rules the plugin runs, minus the ones about keys: those are each person's to add. */
export function managedErrors(section: IntegrationId, values: FieldValues): FieldErrors {
  const all = validateIntegration(section, { ...DEFAULT_INTEGRATIONS[section], ...values } as IntegrationValues)
  return Object.fromEntries(Object.entries(all).filter(([key]) => !personOnly(section, key)))
}

/** Every brand's sections with a field error, for the save bar. */
export function invalidSections(drafts: Drafts): { brandId: string; section: IntegrationId }[] {
  return Object.entries(drafts).flatMap(([brandId, draft]) => INTEGRATION_IDS
    .filter((section) => draft.managed[section] && Object.keys(managedErrors(section, draft.managed[section]!)).length > 0)
    .map((section) => ({ brandId, section })))
}

const same = (a: BrandDraft | undefined, b: BrandDraft | undefined) => JSON.stringify(a) === JSON.stringify(b)

export function dirtyBrands(drafts: Drafts, saved: Drafts): string[] {
  return Object.keys(drafts).filter((id) => !same(drafts[id], saved[id]))
}

/** The dev server's BrandPatch for the changed brands, values trimmed the way the plugin trims them. */
export function patchFor(drafts: Drafts, saved: Drafts): Record<string, { tabs: BrandTabConfig[] | null; personas: Record<string, string[]> | null; integrations: Record<string, FieldValues> | null }> {
  return Object.fromEntries(dirtyBrands(drafts, saved).map((id) => {
    const draft = drafts[id]!
    const sections = INTEGRATION_IDS
      .filter((section) => draft.managed[section])
      .map((section) => [section, withoutSecrets(section, normalizeIntegration(draft.managed[section] as IntegrationValues, section) as FieldValues)] as const)
    return [id, { tabs: draft.tabs ? [...draft.tabs] : null, personas: draft.personas ? copyPersonas(draft.personas) : null, integrations: sections.length ? Object.fromEntries(sections) : null }]
  }))
}
