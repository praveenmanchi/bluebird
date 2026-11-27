// Sign-in records on Cloudflare: one Durable Object per key (worker.ts holds the class).
//
// Not KV: KV deletes take up to a minute to reach every location, so a write key or
// state could be used twice (roadmap §4 item 5). A Durable Object runs one request at
// a time, so take() reads and deletes in one step, and its alarm clears the record
// when the TTL is up. One object per key also means no shared table to fill or sweep.
//
// Nothing here imports cloudflare:workers, so the logic is tested in Node (tests/connect/durable.test.ts).
import type { Store } from './store'

/** The parts of DurableObjectStorage a cell uses. */
export interface CellStorage {
  get<T>(key: string): Promise<T | undefined>
  put<T>(key: string, value: T): Promise<void>
  deleteAll(): Promise<void>
  setAlarm(scheduledTime: number): Promise<void>
  deleteAlarm(): Promise<void>
}

/** One record: what a Durable Object answers over RPC. */
export interface RecordCell {
  put(value: string, ttlSeconds: number): Promise<void>
  get(): Promise<string | null>
  take(): Promise<string | null>
  delete(): Promise<void>
}

interface Entry { value: string; expiresAt: number }

const SLOT = 'record'
/** Bump to start every key in fresh objects (old ones clear themselves by alarm). */
const NAME_VERSION = 'v1'

export function recordCell(storage: CellStorage, now: () => number = Date.now): RecordCell {
  const clear = async (): Promise<void> => {
    await storage.deleteAlarm()
    await storage.deleteAll()
  }
  const live = async (): Promise<Entry | null> => {
    const entry = await storage.get<Entry>(SLOT)
    return entry && entry.expiresAt > now() ? entry : null
  }
  return {
    async put(value, ttlSeconds) {
      const expiresAt = now() + ttlSeconds * 1000
      await storage.put<Entry>(SLOT, { value, expiresAt })
      await storage.setAlarm(expiresAt)
    },
    async get() {
      return (await live())?.value ?? null
    },
    async take() {
      const entry = await live()
      await clear()
      return entry?.value ?? null
    },
    delete: clear,
  }
}

/** The broker's Store on Durable Objects. `cellFor` maps a name to its object's stub. */
export function durableStore(cellFor: (name: string) => RecordCell): Store {
  const cell = (key: string): RecordCell => cellFor(`${NAME_VERSION}:${key}`)
  return {
    put: (key, value, ttlSeconds) => cell(key).put(value, ttlSeconds),
    get: (key) => cell(key).get(),
    take: (key) => cell(key).take(),
    delete: (key) => cell(key).delete(),
  }
}
