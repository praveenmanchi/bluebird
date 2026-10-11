import { describe, it, expect } from 'vitest'
import { createOnboardingHandlers, ONBOARDING_KEY } from './onboarding'
import { createSessionHandlers, type SessionStore } from './session'
import { loadConfig } from '@shared/config'
import { hashAccessCode, ONBOARDING_MSG, SESSION_MSG } from '@shared/session'

function memoryStore(): SessionStore & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>()
  return { data, get: async (k) => data.get(k), set: async (k, v) => { data.set(k, v) }, delete: async (k) => { data.delete(k) }, keys: async () => [...data.keys()] }
}
type Loose = (payload: unknown, ctx: { emit: () => void }) => Promise<unknown>
const call = (h: Record<string, unknown>, type: string, payload?: unknown) => (h[type] as Loose)(payload, { emit: () => undefined })
const fixed = () => new Date('2026-10-11T12:00:00.000Z')

describe('onboarding handlers', () => {
  it('reports not done on first run', async () => {
    const h = createOnboardingHandlers(memoryStore(), fixed)
    expect(await call(h, ONBOARDING_MSG.status)).toEqual({ completedAt: null, skipped: false })
  })

  it('records completion and whether the tour was skipped', async () => {
    const store = memoryStore()
    const h = createOnboardingHandlers(store, fixed)
    expect(await call(h, ONBOARDING_MSG.complete, { skipped: true })).toEqual({ completedAt: '2026-10-11T12:00:00.000Z', skipped: true })
    expect(await call(h, ONBOARDING_MSG.status)).toEqual({ completedAt: '2026-10-11T12:00:00.000Z', skipped: true })
    await call(h, ONBOARDING_MSG.complete, { skipped: false })
    expect(await call(h, ONBOARDING_MSG.status)).toMatchObject({ skipped: false })
  })

  it('treats a malformed payload as finished, not skipped', async () => {
    const h = createOnboardingHandlers(memoryStore(), fixed)
    expect(await call(h, ONBOARDING_MSG.complete, 'yes')).toMatchObject({ skipped: false })
  })

  it('ignores a corrupted stored value', async () => {
    const store = memoryStore()
    store.data.set(ONBOARDING_KEY, { completedAt: 42 })
    expect(await call(createOnboardingHandlers(store, fixed), ONBOARDING_MSG.status)).toEqual({ completedAt: null, skipped: false })
    store.data.set(ONBOARDING_KEY, { completedAt: '', skipped: false })
    expect(await call(createOnboardingHandlers(store, fixed), ONBOARDING_MSG.status)).toEqual({ completedAt: null, skipped: false })
  })

  it('comes back after Reset all Settings', async () => {
    const store = memoryStore()
    const config = loadConfig({ brand: { active: 'a', brands: { a: { label: 'A', accessCodeHash: hashAccessCode('A-CODE'), source: { collection: 'Brand', mode: 'A' } } } }, activePersona: 'p', personas: { p: { label: 'P', tabs: [] } }, tabs: {} })
    const onboarding = createOnboardingHandlers(store, fixed)
    await call(onboarding, ONBOARDING_MSG.complete, { skipped: false })
    await call(createSessionHandlers(config, store), SESSION_MSG.reset)
    expect(await call(onboarding, ONBOARDING_MSG.status)).toEqual({ completedAt: null, skipped: false })
  })
})
