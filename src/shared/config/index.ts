import rawConfig from '@config'
import { loadConfig, resolvePersonas, activeBrand } from './load'

// Validated once at module load, in both the UI and the sandbox bundle.
export const config = loadConfig(rawConfig)
export const personas = resolvePersonas(config)
export const brand = activeBrand(config)
export { loadConfig, resolvePersonas, activeBrand, ConfigError } from './load'
export type { PluginConfig, BrandConfig, PersonaConfig, TabConfig } from './schema'
export type { ResolvedTab, ResolvedPersona } from './load'
export { WINDOW_PRESETS, WINDOW_BOUNDS, WINDOW_MAX, WINDOW_DEFAULT, clampWindow, presetFor } from './window'
export type { WindowPreset, WindowSize } from './window'
