import { describe, it, expect } from 'vitest'
import { config } from '@shared/config'
import { dirtyBrands, draftsFrom, invalidSections, managedDefaults, managedErrors, moveTab, patchFor, setPersonaTab, setTabEnabled, tabRows, withDraft, type BrandDraft } from './draft'

const rows = [{ id: 'a', enabled: true }, { id: 'b', enabled: true }, { id: 'c', enabled: false }]

describe('tab rows', () => {
  it('moves a row and clamps the target', () => {
    expect(moveTab(rows, 0, 2).map((r) => r.id)).toEqual(['b', 'c', 'a'])
    expect(moveTab(rows, 2, -5).map((r) => r.id)).toEqual(['c', 'a', 'b'])
    expect(moveTab(rows, 1, 1)).toEqual(rows)
  })

  it('switches one tab without touching the others', () => {
    expect(setTabEnabled(rows, 'c', true)).toEqual([{ id: 'a', enabled: true }, { id: 'b', enabled: true }, { id: 'c', enabled: true }])
    expect(rows[2]?.enabled).toBe(false)
  })

  it('shows every configured tab, all on, for a brand without an override', () => {
    const drafts = draftsFrom(config)
    expect(tabRows(config, 'bridge', drafts.bridge!).map((r) => r.id)).toEqual(Object.keys(config.tabs))
  })
})

describe('persona features', () => {
  const blank: BrandDraft = { tabs: null, personas: null, managed: {} }
  const defaults = config.personas.content!.tabs

  it('adds and removes a tab for one persona without touching the draft', () => {
    const added = setPersonaTab(config, 'ikea', blank, 'content', 'a11y', true)
    expect(added).toEqual({ content: [...defaults, 'a11y'] })
    expect(setPersonaTab(config, 'ikea', { ...blank, personas: added }, 'content', 'jira', false)).toEqual({ content: [...defaults.filter((t) => t !== 'jira'), 'a11y'] })
    expect(blank.personas).toBeNull()
  })

  it('goes back to no override once the ticks match the defaults again', () => {
    const removed = setPersonaTab(config, 'ikea', blank, 'content', 'jira', false)
    expect(setPersonaTab(config, 'ikea', { ...blank, personas: removed }, 'content', 'jira', true)).toBeNull()
  })

  it('applies a draft to a copy of the config for previews', () => {
    const next = withDraft(config, 'ikea', { ...blank, personas: { content: ['a11y'] } })
    expect(next.brand.brands.ikea?.personas).toEqual({ content: ['a11y'] })
    expect(config.brand.brands.ikea?.personas).toBeUndefined()
  })

  it('sends the override, or null to clear it', () => {
    const saved = draftsFrom(config)
    const patch = patchFor({ ...saved, ikea: { ...saved.ikea!, personas: { content: ['a11y'] } } }, saved)
    expect(patch.ikea?.personas).toEqual({ content: ['a11y'] })
    expect(patchFor(saved, { ...saved, ikea: { ...saved.ikea!, personas: { content: ['a11y'] } } }).ikea?.personas).toBeNull()
  })
})

describe('managed sections', () => {
  it('start from the defaults without keys or tokens', () => {
    expect(managedDefaults('github')).toEqual({ repo: '', branch: 'main', tokenPath: 'tokens.json', baseUrl: '', diffComparison: true })
  })

  it('report field errors but not the missing keys each person adds', () => {
    expect(managedErrors('github', { repo: 'not a repo' })).toHaveProperty('repo')
    expect(managedErrors('dualFile', { enabled: true, files: [{ name: 'Core', id: 'ABC123', role: 'Variables + Components' }] })).toEqual({})
  })
})

describe('patchFor', () => {
  it('sends only changed brands, trimmed, keys stripped', () => {
    const saved = draftsFrom(config)
    const drafts = { ...saved, ikea: { tabs: [{ id: 'jira', enabled: true }], personas: null, managed: { github: { ...managedDefaults('github'), repo: '  ikea/tokens ', apiKey: 'ghp_x' } } } }
    expect(dirtyBrands(drafts, saved)).toEqual(['ikea'])
    const patch = patchFor(drafts, saved)
    expect(Object.keys(patch)).toEqual(['ikea'])
    expect(patch.ikea?.tabs).toEqual([{ id: 'jira', enabled: true }])
    expect(patch.ikea?.integrations?.github).toMatchObject({ repo: 'ikea/tokens' })
    expect(patch.ikea?.integrations?.github).not.toHaveProperty('apiKey')
  })

  it('clears what was reset, and lists sections that block saving', () => {
    const saved = { ikea: { tabs: [{ id: 'jira', enabled: true }], personas: null, managed: { storybook: { baseUrl: 'https://sb.example.com' } } } }
    expect(patchFor({ ikea: { tabs: null, personas: null, managed: {} } }, saved)).toEqual({ ikea: { tabs: null, personas: null, integrations: null } })
    expect(invalidSections({ ikea: { tabs: null, personas: null, managed: { storybook: { baseUrl: 'ftp://x' } } } })).toEqual([{ brandId: 'ikea', section: 'storybook' }])
  })
})
