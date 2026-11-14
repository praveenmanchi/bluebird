// dev.html › Plugin configuration writes per-brand overrides (tab order and
// visibility, persona features, brand-managed Settings) into plugin.config.json. The page
// sends only those three keys per brand; everything else in the file is kept as is,
// and the result must pass the same loadConfig the build runs.
import * as z from 'zod/mini'
import { brandPersonasSchema, brandTabSchema, deploySchema, figmaPluginSchema, managedIntegrationsSchema } from '../../src/shared/config/schema'
import { loadConfig } from '../../src/shared/config/load'

export const CONFIG_ENDPOINT = '/__bluebird/config'
export const DEPLOY_ENDPOINT = '/__bluebird/deploy'

/** Per brand: the full tab list, persona features and managed sections to store. null (or omitted) clears the override. */
export const brandPatchSchema = z.record(
  z.string(),
  z.object({
    tabs: z.optional(z.nullable(z.array(brandTabSchema))),
    personas: z.optional(z.nullable(brandPersonasSchema)),
    integrations: z.optional(z.nullable(managedIntegrationsSchema)),
  }),
)
export type BrandPatch = z.infer<typeof brandPatchSchema>

export class ConfigPatchError extends Error {
  override readonly name = 'ConfigPatchError'
}

const PATCHED_KEYS: readonly string[] = ['tabs', 'personas', 'integrations']

type RawConfig = { brand: { brands: Record<string, Record<string, unknown>> } } & Record<string, unknown>

function isRawConfig(raw: unknown): raw is RawConfig {
  const brand = (raw as { brand?: { brands?: unknown } } | null)?.brand
  return typeof brand?.brands === 'object' && brand.brands !== null
}

/** A section with no keys left manages nothing, so it isn't written. */
function compactIntegrations(integrations: Record<string, object | undefined>): Record<string, object> | undefined {
  const kept = Object.entries(integrations).filter((entry): entry is [string, object] => entry[1] !== undefined && Object.keys(entry[1]).length > 0)
  return kept.length ? Object.fromEntries(kept) : undefined
}

/**
 * The raw config with the patch applied. Throws ConfigPatchError for an unknown brand or a
 * malformed patch, and ConfigError (from loadConfig) when the result would not build.
 */
export function applyBrandPatch(raw: unknown, patch: unknown): RawConfig {
  if (!isRawConfig(raw)) throw new ConfigPatchError('plugin.config.json has no brand.brands to update.')
  const parsed = z.safeParse(brandPatchSchema, patch)
  if (!parsed.success) throw new ConfigPatchError(`The configuration sent from the page is malformed: ${parsed.error.issues.map((i) => i.path.join('.') || '(root)').join(', ')}`)

  const brands = { ...raw.brand.brands }
  for (const [brandId, change] of Object.entries(parsed.data)) {
    const current = Object.prototype.hasOwnProperty.call(brands, brandId) ? brands[brandId] : undefined
    if (!current) throw new ConfigPatchError(`Brand "${brandId}" isn’t in plugin.config.json.`)
    const rest = Object.fromEntries(Object.entries(current).filter(([key]) => !PATCHED_KEYS.includes(key)))
    const integrations = change.integrations ? compactIntegrations(change.integrations) : undefined
    brands[brandId] = {
      ...rest,
      ...(change.tabs ? { tabs: change.tabs } : {}),
      ...(change.personas ? { personas: change.personas } : {}),
      ...(integrations ? { integrations } : {}),
    }
  }
  const next: RawConfig = { ...raw, brand: { ...raw.brand, brands } }
  loadConfig(next)
  return next
}

/** Same layout as the hand-edited file: two-space indent, trailing newline. */
export const formatConfig = (config: unknown): string => `${JSON.stringify(config, null, 2)}\n`

/**
 * dev.html › Plugin configuration › Deployment: multi-brand or one brand, plus the Figma plugin id
 * and name a brand publishes under in its own organisation (null clears them).
 */
export const deployPatchSchema = z.object({
  deploy: deploySchema,
  figmaPlugin: z.optional(z.record(z.string(), z.nullable(figmaPluginSchema))),
})
export type DeployPatch = z.infer<typeof deployPatchSchema>

/** The raw config with deploy and each brand's figmaPlugin replaced. Same errors as applyBrandPatch. */
export function applyDeployPatch(raw: unknown, patch: unknown): RawConfig {
  if (!isRawConfig(raw)) throw new ConfigPatchError('plugin.config.json has no brand.brands to update.')
  const parsed = z.safeParse(deployPatchSchema, patch)
  if (!parsed.success) throw new ConfigPatchError(`The deployment sent from the page is malformed: ${parsed.error.issues.map((i) => i.path.join('.') || '(root)').join(', ')}`)
  const brands = { ...raw.brand.brands }
  for (const [brandId, plugin] of Object.entries(parsed.data.figmaPlugin ?? {})) {
    const current = Object.prototype.hasOwnProperty.call(brands, brandId) ? brands[brandId] : undefined
    if (!current) throw new ConfigPatchError(`Brand "${brandId}" isn’t in plugin.config.json.`)
    const rest = Object.fromEntries(Object.entries(current).filter(([key]) => key !== 'figmaPlugin'))
    const kept = plugin ? Object.fromEntries(Object.entries(plugin).filter(([, v]) => typeof v === 'string' && v.trim() !== '')) : {}
    brands[brandId] = Object.keys(kept).length ? { ...rest, figmaPlugin: kept } : rest
  }
  const { mode, brand } = parsed.data.deploy
  const deploy = mode === 'single' ? { mode, brand } : { mode }
  const next: RawConfig = { ...raw, deploy, brand: { ...raw.brand, brands } }
  loadConfig(next)
  return next
}
