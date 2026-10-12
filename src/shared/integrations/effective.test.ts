import { describe, it, expect } from 'vitest'
import { applyManaged, DEFAULT_INTEGRATIONS, INTEGRATIONS_KEY } from './schema'
import { managedFor, readIntegrations, type Brands } from './effective'
import { SESSION_KEY } from '@shared/session'

const brands: Brands = { acme: { integrations: { github: { repo: 'acme/tokens', branch: 'develop' } } }, plain: {} }
const store = (data: Record<string, unknown>) => async (key: string) => data[key]

describe('applyManaged', () => {
  it('lays the brand values over the stored ones and never takes a key from the brand', () => {
    const stored = { ...DEFAULT_INTEGRATIONS, github: { ...DEFAULT_INTEGRATIONS.github, repo: 'me/fork', apiKey: 'ghp_mine' } }
    const out = applyManaged(stored, { github: { repo: 'acme/tokens', apiKey: 'ghp_brand' } as never })
    expect(out.github).toMatchObject({ repo: 'acme/tokens', apiKey: 'ghp_mine' })
    expect(out.jira).toBe(stored.jira)
  })

  it('returns the settings untouched when nothing is managed', () => {
    expect(applyManaged(DEFAULT_INTEGRATIONS, undefined)).toBe(DEFAULT_INTEGRATIONS)
  })
})

describe('readIntegrations', () => {
  it('uses the signed-in brand’s managed sections', async () => {
    const out = await readIntegrations(store({ [SESSION_KEY]: { brandId: 'acme' }, [INTEGRATIONS_KEY]: { github: { repo: 'me/fork' } } }), brands)
    expect(out.github).toMatchObject({ repo: 'acme/tokens', branch: 'develop' })
  })

  it('is just the stored values when signed out or the brand manages nothing', async () => {
    expect((await readIntegrations(store({ [INTEGRATIONS_KEY]: { github: { repo: 'me/fork' } } }), brands)).github.repo).toBe('me/fork')
    expect((await readIntegrations(store({ [SESSION_KEY]: { brandId: 'plain' } }), brands)).github).toEqual(DEFAULT_INTEGRATIONS.github)
    expect(managedFor('missing', brands)).toBeUndefined()
  })
})
