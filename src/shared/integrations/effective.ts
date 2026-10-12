// The Settings every reader acts on: what the person stored, with the signed-in
// brand's managed sections (plugin.config.json) on top. The sandbox store, each
// feature's settings reader and the mock all go through here, so a managed
// value reaches GitHub, Jira, UX AI and Dual File the same way.
import { config, type BrandConfig } from '@shared/config'
import { SESSION_KEY } from '@shared/session'
import { applyManaged, INTEGRATIONS_KEY, mergeIntegrations, type IntegrationSettings, type ManagedIntegrations } from './schema'

export type ReadStore = (key: string) => Promise<unknown>
export type Brands = Readonly<Record<string, Pick<BrandConfig, 'integrations'>>>

/** The sections a brand manages; undefined when it manages none (or the brand is unknown). */
export function managedFor(brandId: string | null | undefined, brands: Brands = config.brand.brands): ManagedIntegrations | undefined {
  return brandId ? brands[brandId]?.integrations as ManagedIntegrations | undefined : undefined
}

async function sessionBrand(get: ReadStore): Promise<string | null> {
  const session = await get(SESSION_KEY)
  return typeof session === 'object' && session !== null && typeof (session as { brandId?: unknown }).brandId === 'string'
    ? (session as { brandId: string }).brandId
    : null
}

/** The managed sections of whichever brand is signed in. */
export async function readManaged(get: ReadStore, brands?: Brands): Promise<ManagedIntegrations | undefined> {
  return managedFor(await sessionBrand(get), brands)
}

export async function readIntegrations(get: ReadStore, brands?: Brands): Promise<IntegrationSettings> {
  const [stored, managed] = await Promise.all([get(INTEGRATIONS_KEY), readManaged(get, brands)])
  return applyManaged(mergeIntegrations(stored), managed)
}

/** figma.clientStorage as a ReadStore, for the feature sandboxes. */
export const clientStorageRead: ReadStore = (key) => figma.clientStorage.getAsync(key)
