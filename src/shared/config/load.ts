import { pluginConfigSchema, type BrandConfig, type PluginConfig } from './schema'
import { INTEGRATION_IDS, isSecretField } from '../integrations/schema'

export class ConfigError extends Error {
  override readonly name = 'ConfigError'
}

/**
 * Validate raw JSON and enforce cross-field rules the schema cannot express.
 * Throws ConfigError with a readable message. Never returns a partial config.
 */
export function loadConfig(raw: unknown): PluginConfig {
  const parsed = pluginConfigSchema.safeParse(raw)
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  ${i.path.join('.') || '(root)'}: ${i.message}`)
    throw new ConfigError(`plugin.config.json is invalid:\n${lines.join('\n')}`)
  }
  const config = parsed.data
  const errors: string[] = []

  if (!config.brand.brands[config.brand.active]) {
    errors.push(`brand.active "${config.brand.active}" is not defined in brand.brands`)
  }
  errors.push(...deployErrors(config))
  const hashes = new Map<string, string>()
  for (const [brandId, b] of Object.entries(config.brand.brands)) {
    if (b.accessCodeHash) {
      const other = hashes.get(b.accessCodeHash)
      if (other) errors.push(`brands "${other}" and "${brandId}" share the same access code`)
      hashes.set(b.accessCodeHash, brandId)
    } else if (config.deploy.mode === 'multi') {
      errors.push(`brand "${brandId}" has no accessCodeHash: a multi-brand plugin needs one per brand (npm run access-code -- <code>)`)
    }
    errors.push(...brandErrors(brandId, b, config))
  }
  if (!config.personas[config.activePersona]) {
    errors.push(`activePersona "${config.activePersona}" is not defined in personas`)
  } else if (!config.personas[config.activePersona]!.enabled) {
    errors.push(`activePersona "${config.activePersona}" is turned off`)
  }
  for (const [personaId, persona] of Object.entries(config.personas)) {
    for (const tabId of persona.tabs) {
      if (!config.tabs[tabId]) errors.push(`persona "${personaId}" references unknown tab "${tabId}"`)
    }
    if (new Set(persona.tabs).size !== persona.tabs.length) {
      errors.push(`persona "${personaId}" lists a tab more than once`)
    }
  }
  if (errors.length) throw new ConfigError(`plugin.config.json is invalid:\n${errors.map((e) => `  ${e}`).join('\n')}`)
  return config
}

/** Single-brand mode names a brand that exists. */
function deployErrors(config: PluginConfig): string[] {
  if (config.deploy.mode !== 'single') return []
  const id = config.deploy.brand
  if (!id) return ['deploy.mode is "single" but deploy.brand is not set: name the brand this build is for']
  return config.brand.brands[id] ? [] : [`deploy.brand "${id}" is not defined in brand.brands`]
}

/** The brand a single-brand build is locked to; null in a multi-brand build. */
export function singleBrand(config: PluginConfig): string | null {
  return config.deploy.mode === 'single' ? config.deploy.brand ?? null : null
}

/** A brand's tab and persona lists name real tabs once each, and its managed Settings carry no keys or tokens. */
function brandErrors(brandId: string, b: BrandConfig, config: PluginConfig): string[] {
  const errors: string[] = []
  const ids = (b.tabs ?? []).map((t) => t.id)
  for (const tabId of ids) {
    if (!config.tabs[tabId]) errors.push(`brand "${brandId}" lists unknown tab "${tabId}"`)
  }
  if (new Set(ids).size !== ids.length) errors.push(`brand "${brandId}" lists a tab more than once`)
  for (const [personaId, tabs] of Object.entries(b.personas ?? {})) {
    if (!config.personas[personaId]) errors.push(`brand "${brandId}" sets unknown persona "${personaId}"`)
    for (const tabId of tabs) {
      if (!config.tabs[tabId]) errors.push(`brand "${brandId}" gives persona "${personaId}" unknown tab "${tabId}"`)
    }
    if (new Set(tabs).size !== tabs.length) errors.push(`brand "${brandId}" gives persona "${personaId}" a tab more than once`)
  }
  if ((b.tabs || b.personas) && !errors.length && resolvePersonas(config, brandId).length === 0) errors.push(`brand "${brandId}" hides every tab: turn at least one on`)
  for (const section of INTEGRATION_IDS) {
    for (const key of Object.keys(b.integrations?.[section] ?? {})) {
      if (isSecretField(section, key)) errors.push(`brand "${brandId}" sets integrations.${section}.${key}: keys and tokens are entered in the plugin, never in plugin.config.json`)
    }
  }
  return errors
}

export interface ResolvedTab {
  id: string
  label: string
  icon: string
}

export interface ResolvedPersona {
  id: string
  label: string
  tabs: readonly ResolvedTab[]
}

/** The tab ids a persona gets: the brand's own list when it sets one, else the persona's. */
export function personaTabIds(config: PluginConfig, personaId: string, brandId?: string): readonly string[] {
  const own = brandId ? config.brand.brands[brandId]?.personas?.[personaId] : undefined
  return own ?? config.personas[personaId]?.tabs ?? []
}

/**
 * Personas that have at least one enabled tab, in config order. With a brand, its persona lists
 * replace the default tabs, and its tab list hides the tabs it turns off and sets the order;
 * tabs it doesn't list keep persona order, after the listed ones.
 */
export function resolvePersonas(config: PluginConfig, brandId?: string): readonly ResolvedPersona[] {
  const brandTabs = brandId ? config.brand.brands[brandId]?.tabs : undefined
  const rank = new Map((brandTabs ?? []).map((t, i) => [t.id, i]))
  const hidden = new Set((brandTabs ?? []).filter((t) => !t.enabled).map((t) => t.id))
  const order = (tabs: readonly string[]) => tabs
    .map((tabId, i) => ({ tabId, key: rank.get(tabId) ?? rank.size + i }))
    .sort((a, b) => a.key - b.key)
    .map((t) => t.tabId)
  return Object.entries(config.personas)
    .filter(([, persona]) => persona.enabled)
    .map(([id, persona]) => ({
      id,
      label: persona.label,
      tabs: order(personaTabIds(config, id, brandId))
        .filter((tabId) => config.tabs[tabId]?.enabled && !hidden.has(tabId))
        .map((tabId) => ({ id: tabId, label: config.tabs[tabId]!.label, icon: config.tabs[tabId]!.icon })),
    }))
    .filter((p) => p.tabs.length > 0)
}

export interface BrandTabRow extends ResolvedTab {
  /** This brand shows the tab. */
  enabled: boolean
  /** tabs.<id>.enabled: off hides the tab for every brand. */
  available: boolean
  /** Labels of the enabled personas whose tab bar includes it in this brand. */
  personas: readonly string[]
}

/** Every configured tab in this brand's order, for the configuration page: listed tabs first, then the rest in config order. */
export function brandTabRows(config: PluginConfig, brandId: string): readonly BrandTabRow[] {
  const listed = config.brand.brands[brandId]?.tabs ?? []
  const listedIds = new Set(listed.map((t) => t.id))
  const rows = [
    ...listed.filter((t) => config.tabs[t.id]),
    ...Object.keys(config.tabs).filter((id) => !listedIds.has(id)).map((id) => ({ id, enabled: true })),
  ]
  return rows.map(({ id, enabled }) => {
    const tab = config.tabs[id]!
    return {
      id,
      label: tab.label,
      icon: tab.icon,
      enabled,
      available: tab.enabled,
      personas: Object.entries(config.personas)
        .filter(([personaId, p]) => p.enabled && personaTabIds(config, personaId, brandId).includes(id))
        .map(([, p]) => p.label),
    }
  })
}

export function activeBrand(config: PluginConfig) {
  return { id: config.brand.active, ...config.brand.brands[config.brand.active]! }
}
