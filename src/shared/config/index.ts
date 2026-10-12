import rawConfig from '@config'
import { loadConfig, resolvePersonas, activeBrand } from './load'

// Validated once at module load, in both the UI and the sandbox bundle.
export const config = loadConfig(rawConfig)
export const personas = resolvePersonas(config)
export const brand = activeBrand(config)
export { loadConfig, resolvePersonas, brandTabRows, activeBrand, ConfigError } from './load'
export type { PluginConfig, BrandConfig, BrandTabConfig, PersonaConfig, TabConfig } from './schema'
export type { ResolvedTab, ResolvedPersona, BrandTabRow } from './load'
export { WINDOW_PRESETS, WINDOW_BOUNDS, WINDOW_MAX, WINDOW_DEFAULT, clampWindow, presetFor } from './window'
export type { WindowPreset, WindowSize } from './window'
