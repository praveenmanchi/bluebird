import { pluginConfigSchema, type PluginConfig } from './schema'

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
  const hashes = new Map<string, string>()
  for (const [brandId, b] of Object.entries(config.brand.brands)) {
    const other = hashes.get(b.accessCodeHash)
    if (other) errors.push(`brands "${other}" and "${brandId}" share the same access code`)
    hashes.set(b.accessCodeHash, brandId)
  }
  if (!config.personas[config.activePersona]) {
    errors.push(`activePersona "${config.activePersona}" is not defined in personas`)
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

/** Personas that have at least one enabled tab, in config order. */
export function resolvePersonas(config: PluginConfig): readonly ResolvedPersona[] {
  return Object.entries(config.personas)
    .map(([id, persona]) => ({
      id,
      label: persona.label,
      tabs: persona.tabs
        .filter((tabId) => config.tabs[tabId]?.enabled)
        .map((tabId) => ({ id: tabId, label: config.tabs[tabId]!.label, icon: config.tabs[tabId]!.icon })),
    }))
    .filter((p) => p.tabs.length > 0)
}

export function activeBrand(config: PluginConfig) {
  return { id: config.brand.active, ...config.brand.brands[config.brand.active]! }
}
