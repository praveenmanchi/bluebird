// Short-lived key-value storage for sign-in records. Cloudflare KV in Bluebird
// Cloud, Redis or SQLite in the Gateway, memory in tests and local runs: the
// broker only needs these four calls, so swapping hosts means one adapter.

export interface Store {
  put(key: string, value: string, ttlSeconds: number): Promise<void>
  get(key: string): Promise<string | null>
  /** Reads and deletes. Records that may be used once go through here. */
  take(key: string): Promise<string | null>
  delete(key: string): Promise<void>
}

interface Entry { value: string; expiresAt: number }

const MAX_ENTRIES = 50_000

/** In-process store. Fine for one Node process; not shared between Worker isolates. */
export function memoryStore(now: () => number = Date.now, maxEntries = MAX_ENTRIES): Store {
  const entries = new Map<string, Entry>()
  const live = (key: string): Entry | null => {
    const entry = entries.get(key)
    if (!entry) return null
    if (entry.expiresAt <= now()) { entries.delete(key); return null }
    return entry
  }
  const makeRoom = () => {
    const at = now()
    for (const [key, entry] of entries) if (entry.expiresAt <= at) entries.delete(key)
    // Still full: drop the oldest records (Map keeps insertion order). Rate limits keep this rare.
    for (const key of entries.keys()) {
      if (entries.size < maxEntries) break
      entries.delete(key)
    }
  }
  return {
    async put(key, value, ttlSeconds) {
      if (!entries.has(key) && entries.size >= maxEntries) makeRoom()
      entries.set(key, { value, expiresAt: now() + ttlSeconds * 1000 })
    },
    async get(key) {
      return live(key)?.value ?? null
    },
    async take(key) {
      const entry = live(key)
      entries.delete(key)
      return entry?.value ?? null
    },
    async delete(key) {
      entries.delete(key)
    },
  }
}
