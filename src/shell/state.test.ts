import { describe, it, expect, vi, beforeEach } from 'vitest'

// A config where Ikea reorders the tabs and hides Jira; Bridge keeps the persona order.
vi.mock('@config', async () => {
  const real = (await vi.importActual<{ default: { brand: { brands: Record<string, object> } } }>('@config')).default
  return {
    default: {
      ...real,
      activePersona: 'ui-designer',
      brand: { ...real.brand, brands: { ...real.brand.brands, ikea: { ...real.brand.brands.ikea, tabs: [{ id: 'uxai', enabled: true }, { id: 'jira', enabled: false }] } } },
    },
  }
})

const { activeTabId, brandPersonas, selectTab, session, syncTabs, visibleTabs } = await import('./state')

const signIn = (brandId: string | null) => { session.value = brandId ? { brandId, since: '2026-10-12T00:00:00.000Z' } : null; syncTabs() }

describe('brand-aware tabs', () => {
  beforeEach(() => signIn(null))

  it('uses the persona order until a brand is signed in', () => {
    expect(visibleTabs.value.map((t) => t.id)).toEqual(['a11y', 'varsearch', 'varmapper', 'jira', 'mcp', 'uxai', 'agents', 'history'])
  })

  it('applies the signed-in brand’s order and hidden tabs', () => {
    signIn('ikea')
    expect(visibleTabs.value.map((t) => t.id)).toEqual(['uxai', 'a11y', 'varsearch', 'varmapper', 'mcp', 'agents', 'history'])
    expect(brandPersonas.value.find((p) => p.id === 'design-system')?.tabs[0]?.id).toBe('uxai')
  })

  it('moves off a tab the new brand hides, and keeps one it still shows', () => {
    selectTab('jira')
    signIn('ikea')
    expect(activeTabId.value).toBe('uxai')
    selectTab('agents')
    signIn('bridge')
    expect(activeTabId.value).toBe('agents')
  })
})
