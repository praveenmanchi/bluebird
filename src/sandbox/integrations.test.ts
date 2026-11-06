import { describe, it, expect } from 'vitest'
import { createIntegrationsHandlers } from './integrations'
import { createSessionHandlers, type SessionStore } from './session'
import { loadConfig } from '@shared/config'
import { DEFAULT_INTEGRATIONS, INTEGRATIONS_KEY, INTEGRATIONS_MSG } from '@shared/integrations'
import { hashAccessCode, SESSION_MSG } from '@shared/session'

function memoryStore(): SessionStore & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>()
  return { data, get: async (k) => data.get(k), set: async (k, v) => { data.set(k, v) }, delete: async (k) => { data.delete(k) }, keys: async () => [...data.keys()] }
}
const ctx = { emit: () => undefined }
type Loose = (payload: unknown, ctx: { emit: () => void }) => Promise<unknown>
const call = (h: ReturnType<typeof createIntegrationsHandlers>, type: string, payload?: unknown) => (h[type] as unknown as Loose)(payload, ctx)

const github = { ...DEFAULT_INTEGRATIONS.github, apiKey: 'ghp_x', repo: 'gap-inc/design-tokens' }

describe('integrations handlers', () => {
  it('returns the defaults before anything is saved', async () => {
    const h = createIntegrationsHandlers(memoryStore())
    expect(await call(h, INTEGRATIONS_MSG.get)).toEqual(DEFAULT_INTEGRATIONS)
  })

  it('saves one section and leaves the others on their defaults', async () => {
    const store = memoryStore()
    const h = createIntegrationsHandlers(store)
    expect(await call(h, INTEGRATIONS_MSG.save, { section: 'github', values: github })).toEqual(github)
    const all = await call(h, INTEGRATIONS_MSG.get) as typeof DEFAULT_INTEGRATIONS
    expect(all.github).toEqual(github)
    expect(all.jira).toEqual(DEFAULT_INTEGRATIONS.jira)
    expect(store.data.has(INTEGRATIONS_KEY)).toBe(true)
  })

  it('rejects an unknown section, a wrong shape and a value that fails the field rules', async () => {
    const h = createIntegrationsHandlers(memoryStore())
    await expect(call(h, INTEGRATIONS_MSG.save, { section: 'slack', values: {} })).rejects.toThrow('isn’t recognised')
    await expect(call(h, INTEGRATIONS_MSG.save, { section: 'github', values: { ...github, diffComparison: 'yes' } })).rejects.toThrow('missing or too long')
    await expect(call(h, INTEGRATIONS_MSG.save, { section: 'github', values: { ...github, repo: 'not a repo' } })).rejects.toThrow('owner/repository')
  })

  it('falls back to defaults for a stored section that no longer parses', async () => {
    const store = memoryStore()
    store.data.set(INTEGRATIONS_KEY, { github: { apiKey: 42 }, jira: { ...DEFAULT_INTEGRATIONS.jira, projectKey: 'DS' } })
    const all = await call(createIntegrationsHandlers(store), INTEGRATIONS_MSG.get) as typeof DEFAULT_INTEGRATIONS
    expect(all.github).toEqual(DEFAULT_INTEGRATIONS.github)
    expect(all.jira.projectKey).toBe('DS')
  })

  it('is cleared by "Reset all settings" with the rest of the bluebird: keys', async () => {
    const store = memoryStore()
    await call(createIntegrationsHandlers(store), INTEGRATIONS_MSG.save, { section: 'github', values: github })
    const config = loadConfig({ brand: { active: 'a', brands: { a: { label: 'A', accessCodeHash: hashAccessCode('A-CODE'), source: { collection: 'Brand', mode: 'A' } } } }, activePersona: 'p', personas: { p: { label: 'P', tabs: [] } }, tabs: {} })
    const session = createSessionHandlers(config, store)
    await (session[SESSION_MSG.reset] as unknown as Loose)(undefined, ctx)
    expect(store.data.has(INTEGRATIONS_KEY)).toBe(false)
  })

  it('trims values and keeps both of two back-to-back saves', async () => {
    const store = memoryStore()
    const h = createIntegrationsHandlers(store)
    await Promise.all([
      call(h, INTEGRATIONS_MSG.save, { section: 'github', values: { ...github, repo: ' gap-inc/design-tokens ' } }),
      call(h, INTEGRATIONS_MSG.save, { section: 'jira', values: { ...DEFAULT_INTEGRATIONS.jira, projectKey: 'DS' } }),
    ])
    const all = await call(h, INTEGRATIONS_MSG.get) as typeof DEFAULT_INTEGRATIONS
    expect(all.github.repo).toBe('gap-inc/design-tokens')
    expect(all.jira.projectKey).toBe('DS')
  })
})

describe('brand-managed sections', () => {
  const brands = { acme: { integrations: { github: { repo: 'acme/tokens', branch: 'develop' }, dualFile: { enabled: true, file1Id: 'ABC123' } } } }
  const signedIn = () => { const store = memoryStore(); store.data.set('bluebird:session', { brandId: 'acme', since: '2026-10-12' }); return store }

  it('reads the brand values over the person’s and stores only the person’s', async () => {
    const store = signedIn()
    const h = createIntegrationsHandlers(store, brands)
    const saved = await call(h, INTEGRATIONS_MSG.save, { section: 'github', values: { ...github, repo: 'me/fork' } }) as typeof github
    expect(saved).toMatchObject({ repo: 'acme/tokens', branch: 'develop', apiKey: 'ghp_x' })
    // A locked field isn't the person's to set: neither the brand value nor what the form sent for it is stored.
    expect((store.data.get(INTEGRATIONS_KEY) as typeof DEFAULT_INTEGRATIONS).github).toMatchObject({ repo: '', apiKey: 'ghp_x' })
    expect(((await call(h, INTEGRATIONS_MSG.get)) as typeof DEFAULT_INTEGRATIONS).github.repo).toBe('acme/tokens')
  })

  it('keeps the person’s own values when the form sends the locked brand values back (as the UI does)', async () => {
    const store = signedIn()
    store.data.set(INTEGRATIONS_KEY, { github: { ...DEFAULT_INTEGRATIONS.github, repo: 'me/fork' } })
    const h = createIntegrationsHandlers(store, brands)
    const shown = ((await call(h, INTEGRATIONS_MSG.get)) as typeof DEFAULT_INTEGRATIONS).github
    await call(h, INTEGRATIONS_MSG.save, { section: 'github', values: { ...shown, apiKey: 'ghp_mine' } })
    expect((store.data.get(INTEGRATIONS_KEY) as typeof DEFAULT_INTEGRATIONS).github).toMatchObject({ repo: 'me/fork', branch: 'main', apiKey: 'ghp_mine' })
    store.data.delete('bluebird:session')
    expect(((await call(h, INTEGRATIONS_MSG.get)) as typeof DEFAULT_INTEGRATIONS).github.repo).toBe('me/fork')
  })

  it('checks the rules on what the plugin acts on: a managed file still needs the person’s key', async () => {
    const h = createIntegrationsHandlers(signedIn(), brands)
    await expect(call(h, INTEGRATIONS_MSG.save, { section: 'dualFile', values: DEFAULT_INTEGRATIONS.dualFile })).rejects.toThrow('API key that can open File 1')
    expect(await call(h, INTEGRATIONS_MSG.save, { section: 'dualFile', values: { ...DEFAULT_INTEGRATIONS.dualFile, file1Key: 'figd_x' } })).toMatchObject({ file1Id: 'ABC123', file1Key: 'figd_x' })
  })
})

