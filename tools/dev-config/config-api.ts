// dev.html › Plugin configuration writes per-brand overrides (tab order and
// visibility, brand-managed Settings) into plugin.config.json. The page sends
// only those two keys per brand; everything else in the file is kept as is,
// and the result must pass the same loadConfig the build runs.
import * as z from 'zod/mini'
import { brandTabSchema, managedIntegrationsSchema } from '../../src/shared/config/schema'
import { loadConfig } from '../../src/shared/config/load'

export const CONFIG_ENDPOINT = '/__bluebird/config'

/** Per brand: the full tab list and managed sections to store. null (or omitted) clears the override. */
export const brandPatchSchema = z.record(
  z.string(),
  z.object({
    tabs: z.optional(z.nullable(z.array(brandTabSchema))),
    integrations: z.optional(z.nullable(managedIntegrationsSchema)),
  }),
)
export type BrandPatch = z.infer<typeof brandPatchSchema>

export class ConfigPatchError extends Error {
  override readonly name = 'ConfigPatchError'
}

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
    const rest = Object.fromEntries(Object.entries(current).filter(([key]) => key !== 'tabs' && key !== 'integrations'))
    const integrations = change.integrations ? compactIntegrations(change.integrations) : undefined
    brands[brandId] = {
      ...rest,
      ...(change.tabs ? { tabs: change.tabs } : {}),
      ...(integrations ? { integrations } : {}),
    }
  }
  const next: RawConfig = { ...raw, brand: { ...raw.brand, brands } }
  loadConfig(next)
  return next
}

/** Same layout as the hand-edited file: two-space indent, trailing newline. */
export const formatConfig = (config: unknown): string => `${JSON.stringify(config, null, 2)}\n`
