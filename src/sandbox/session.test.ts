import { describe, it, expect } from 'vitest'
import { createSessionHandlers, brandForCode, SESSION_KEY, type SessionStore } from './session'
import { loadConfig } from '@shared/config'
import { hashAccessCode, SESSION_MSG, userKeyFor } from '@shared/session'

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
  it('answers a one-way key of the Figma user for login analytics, and never stores it', async () => {
    const store = memoryStore()
    const h = createSessionHandlers(config, store, () => '1234567890')
    const result = await call(h, SESSION_MSG.login, { code: 'A-CODE' }) as { brandId: string; userKey: string | null }
    expect(result.userKey).toBe(userKeyFor('1234567890'))
    expect(result.userKey).toMatch(/^[0-9a-f]{64}$/)
    expect(result.userKey).not.toContain('1234567890')
    expect(store.data.get(SESSION_KEY)).not.toHaveProperty('userKey')
    expect(await call(h, SESSION_MSG.status)).not.toHaveProperty('userKey')
  })
  it('answers a null user key when Figma shares no user', async () => {
    const none = await call(createSessionHandlers(config, memoryStore(), () => null), SESSION_MSG.login, { code: 'A-CODE' }) as { userKey: string | null }
    expect(none.userKey).toBeNull()
    const unset = await call(createSessionHandlers(config, memoryStore()), SESSION_MSG.login, { code: 'A-CODE' }) as { userKey: string | null }
    expect(unset.userKey).toBeNull()
  })
  it('reset clears every bluebird key and ignores stale brands', async () => {
    const store = memoryStore()
    store.data.set(SESSION_KEY, { brandId: 'gone', since: '' })
    store.data.set('bluebird:relay-token', 'x')
    store.data.set('other', 1)
    const h = createSessionHandlers(config, store)
    expect(await call(h, SESSION_MSG.status)).toBeNull()
    await call(h, SESSION_MSG.reset)
    expect([...store.data.keys()]).toEqual(['other'])
  })
})

describe('single-brand session handlers', () => {
  const single = loadConfig({
    brand: { active: 'b', brands: { b: { label: 'B', source: { collection: 'Brand', mode: 'B' } } } },
    deploy: { mode: 'single', brand: 'b' },
    activePersona: 'p', personas: { p: { label: 'P', tabs: [] } }, tabs: {},
  })

  it('is always in the brand, keeping the first-run date, without a code', async () => {
    const store = memoryStore()
    const h = createSessionHandlers(single, store)
    const first = await call(h, SESSION_MSG.status) as { brandId: string; since: string }
    expect(first.brandId).toBe('b')
    expect(store.data.get(SESSION_KEY)).toEqual(first)
    expect(await call(h, SESSION_MSG.status)).toEqual(first)
    expect(await call(h, SESSION_MSG.login, { code: '' })).toEqual(first)
  })

  it('replaces a session left from another brand, ignores sign-out and still resets', async () => {
    const store = memoryStore()
    store.data.set(SESSION_KEY, { brandId: 'old', since: '2020-01-01' })
    store.data.set('bluebird:persona', 'p')
    const h = createSessionHandlers(single, store)
    expect(await call(h, SESSION_MSG.status)).toMatchObject({ brandId: 'b' })
    await call(h, SESSION_MSG.logout)
    expect(store.data.get(SESSION_KEY)).toMatchObject({ brandId: 'b' })
    await call(h, SESSION_MSG.reset)
    expect(store.data.size).toBe(0)
  })
})

