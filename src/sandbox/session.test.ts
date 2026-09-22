import { describe, it, expect } from 'vitest'
import { createSessionHandlers, brandForCode, SESSION_KEY, type SessionStore } from './session'
import { loadConfig } from '@shared/config'
import { hashAccessCode, SESSION_MSG } from '@shared/session'

const config = loadConfig({
  brand: { active: 'a', brands: {
    a: { label: 'A', accessCodeHash: hashAccessCode('A-CODE'), source: { collection: 'Brand', mode: 'A' } },
    b: { label: 'B', accessCodeHash: hashAccessCode('B-CODE'), source: { collection: 'Brand', mode: 'B' } },
  } },
  activePersona: 'p', personas: { p: { label: 'P', tabs: [] } }, tabs: {},
})

function memoryStore(): SessionStore & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>()
  return { data, get: async (k) => data.get(k), set: async (k, v) => { data.set(k, v) }, delete: async (k) => { data.delete(k) }, keys: async () => [...data.keys()] }
}
const ctx = { emit: () => undefined }
// HandlerMap erases payload types; call through a loose signature in tests.
type Loose = (payload: unknown, ctx: { emit: () => void }) => Promise<unknown>
const call = (h: ReturnType<typeof createSessionHandlers>, type: string, payload?: unknown) => (h[type] as unknown as Loose)(payload, ctx)

describe('session handlers', () => {
  it('maps codes to brands ignoring case and whitespace', () => {
    expect(brandForCode(config, ' b-code ')).toBe('b')
    expect(brandForCode(config, 'nope')).toBeNull()
  })
  it('logs in, reports status, logs out', async () => {
    const store = memoryStore()
    const h = createSessionHandlers(config, store)
    expect(await call(h, SESSION_MSG.status)).toBeNull()
    const session = await call(h, SESSION_MSG.login, { code: 'a-code' }) as { brandId: string }
    expect(session.brandId).toBe('a')
    expect(await call(h, SESSION_MSG.status)).toMatchObject({ brandId: 'a' })
    await call(h, SESSION_MSG.logout)
    expect(await call(h, SESSION_MSG.status)).toBeNull()
  })
  it('rejects empty and unknown codes with readable messages', async () => {
    const h = createSessionHandlers(config, memoryStore())
    await expect(call(h, SESSION_MSG.login, { code: '' })).rejects.toThrow(/Enter the access code/)
    await expect(call(h, SESSION_MSG.login, { code: 'wrong' })).rejects.toThrow(/not recognised/)
  })
  it('"Keep me signed in" off keeps the session for the current run only', async () => {
    const store = memoryStore()
    const run1 = createSessionHandlers(config, store, 'run-1')
    await call(run1, SESSION_MSG.login, { code: 'a-code' })
    await call(run1, SESSION_MSG.update, { keepSignedIn: false })
    expect(await call(run1, SESSION_MSG.status)).toMatchObject({ brandId: 'a', keepSignedIn: false })
    const run2 = createSessionHandlers(config, store, 'run-2')
    expect(await call(run2, SESSION_MSG.status)).toBeNull()
    await call(run2, SESSION_MSG.login, { code: 'b-code' })
    await call(run2, SESSION_MSG.update, { keepSignedIn: true })
    expect(await call(createSessionHandlers(config, store, 'run-3'), SESSION_MSG.status)).toMatchObject({ brandId: 'b', keepSignedIn: true })
  })

  it('reset clears every bluebird key and ignores stale brands', async () => {
    const store = memoryStore()
    store.data.set(SESSION_KEY, { brandId: 'gone', since: '', keepSignedIn: true })
    store.data.set('bluebird:relay-token', 'x')
    store.data.set('other', 1)
    const h = createSessionHandlers(config, store)
    expect(await call(h, SESSION_MSG.status)).toBeNull()
    await call(h, SESSION_MSG.reset)
    expect([...store.data.keys()]).toEqual(['other'])
  })
})
