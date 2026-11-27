// Login analytics: the plugin reports each access-code login (src/shared/analytics/login.ts), and the
// broker writes it to Workers Analytics Engine on Bluebird Cloud (worker.ts). Nothing else is counted.
//
// What's stored, per login: brand id, plugin version, the caller's country (from Cloudflare), and a
// pseudonymous user id. The sandbox hashes the Figma user id before it leaves Figma; the broker
// HMACs that hash with its own secret, so the stored id can't be traced back to a Figma account
// without the server's key. No access code, name, e-mail or IP is ever sent or stored.

export interface LoginReport {
  /** Brand id from plugin.config.json, e.g. "gap". */
  brand: string
  /** SHA-256 hex of the Figma user id, from the sandbox; null when Figma shares no user. */
  user: string | null
  version: string
}

export interface LoginEvent {
  brand: string
  /** Server-side pseudonym (32 hex chars), or null. */
  user: string | null
  version: string
  /** Two-letter country code from Cloudflare, or '' elsewhere. */
  country: string
}

export interface Analytics {
  login(event: LoginEvent): void
}

const MAX_BODY_CHARS = 1_024
const BRAND = /^[a-z0-9][a-z0-9-]{0,39}$/
const USER_KEY = /^[0-9a-f]{64}$/
const VERSION = /^[0-9A-Za-z.+-]{1,32}$/

/** The event the plugin sent, or null when it's anything but the three expected fields in shape. */
export function parseLoginEvent(text: string): LoginReport | null {
  if (text.length > MAX_BODY_CHARS) return null
  let body: unknown
  try { body = JSON.parse(text) } catch { return null }
  if (typeof body !== 'object' || body === null) return null
  const { brand, user, version } = body as Record<string, unknown>
  if (typeof brand !== 'string' || !BRAND.test(brand)) return null
  if (typeof version !== 'string' || !VERSION.test(version)) return null
  if (user !== null && (typeof user !== 'string' || !USER_KEY.test(user))) return null
  return { brand, user, version }
}

/** The parts of an AnalyticsEngineDataset this uses. */
export interface DataPointWriter {
  writeDataPoint(point: { indexes: string[]; blobs: string[]; doubles: number[] }): void
}

/**
 * Columns, for queries (tools/connect/logins.ts): blob1 event ("login"), blob2 brand, blob3 user id
 * ('' when unknown), blob4 plugin version, blob5 country; double1 = 1. Indexed (sampled) by brand.
 */
export function analyticsEngine(dataset: DataPointWriter): Analytics {
  return {
    login: ({ brand, user, version, country }) => {
      dataset.writeDataPoint({ indexes: [brand], blobs: ['login', brand, user ?? '', version, country], doubles: [1] })
    },
  }
}
