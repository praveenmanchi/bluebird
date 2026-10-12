import { describe, it, expect } from 'vitest'
import { pageLabel, placeComponents, resolveLayout, inCoverage, type TreeNode } from './componentPages'

const legacyPage = { id: 'legacy', name: 'Components' }
const tiers = [{ id: 'pa', name: 'Atoms' }, { id: 'pm', name: 'Molecules' }]

describe('pageLabel', () => {
  it('strips the page-list indent and arrow', () => {
    expect(pageLabel('  ↳ Atoms')).toBe('Atoms')
    expect(pageLabel('Molecules')).toBe('Molecules')
  })
})

describe('resolveLayout', () => {
  it('uses the tier pages when the file has every one of them, by id', () => {
    const layout = resolveLayout({ componentsPage: legacyPage, componentPages: tiers }, [{ id: 'pa', name: '  ↳ Atoms' }, { id: 'pm', name: '  ↳ Molecules' }, legacyPage])
    expect(layout).toEqual({ kind: 'tiered', pages: tiers })
  })

  it('falls back to the page name when an id changed (e.g. after a branch merge)', () => {
    const layout = resolveLayout({ componentsPage: legacyPage, componentPages: tiers }, [{ id: 'x1', name: '  ↳ Atoms' }, { id: 'x2', name: '  ↳ Molecules' }])
    expect(layout).toEqual({ kind: 'tiered', pages: [{ id: 'x1', name: 'Atoms' }, { id: 'x2', name: 'Molecules' }] })
  })

  it('uses the legacy Components page when the file has none of the tier pages yet', () => {
    expect(resolveLayout({ componentsPage: legacyPage, componentPages: tiers }, [legacyPage])).toEqual({ kind: 'legacy', pages: [legacyPage] })
    expect(resolveLayout({ componentsPage: legacyPage }, [])).toEqual({ kind: 'legacy', pages: [legacyPage] })
  })

  it('refuses a half-migrated file rather than silently dropping components', () => {
    expect(() => resolveLayout({ componentsPage: legacyPage, componentPages: tiers }, [{ id: 'pa', name: 'Atoms' }])).toThrow(/Molecules/)
  })
})

const set = (id: string, name: string, variants = 1): TreeNode => ({ id, name, type: 'COMPONENT_SET', children: Array.from({ length: variants }, (_, i) => ({ id: `${id}v${i}`, name: `V=${i}`, type: 'COMPONENT' })) })
const doc = (comp: TreeNode): TreeNode => ({ id: `doc-${comp.id}`, name: `Doc/${comp.name}`, type: 'FRAME', children: [
  { id: `h-${comp.id}`, name: 'Header', type: 'FRAME', children: [{ id: `t-${comp.id}`, name: 'Title', type: 'TEXT' }] },
  { id: `st-${comp.id}`, name: 'Stage', type: 'FRAME', children: [comp] },
] })

describe('placeComponents', () => {
  it('finds main components nested in doc frames on tier pages, tagged with tier and tab section', () => {
    const atoms: TreeNode = { id: 'pa', name: '  ↳ Atoms', type: 'CANVAS', children: [
      { id: 'hdr', name: 'Page header', type: 'FRAME', children: [] },
      { id: 'sa', name: 'Atoms', type: 'SECTION', children: [doc(set('rating', 'Rating', 3))] },
    ] }
    const molecules: TreeNode = { id: 'pm', name: '  ↳ Molecules', type: 'CANVAS', children: [
      { id: 'sj', name: 'Jira', type: 'SECTION', children: [
        { id: 'title', name: 'Section title', type: 'FRAME', children: [] },
        doc({ id: 'ticket', name: 'Ticket Row', type: 'COMPONENT', children: [{ id: 'inst', name: 'Avatar', type: 'INSTANCE', children: [{ id: 'nested', name: 'Inner', type: 'COMPONENT' }] }] }),
      ] },
    ] }
    const placed = placeComponents({ kind: 'tiered', pages: [atoms, molecules] }, tiers)
    expect(placed.map((p) => [p.node.id, p.tier, p.group])).toEqual([['rating', 'Atoms', 'Atoms'], ['ticket', 'Molecules', 'Jira']])
  })

  it('keeps the legacy rules: top-level sets, and sets directly inside sections', () => {
    const page: TreeNode = { id: 'legacy', name: 'Components', type: 'CANVAS', children: [
      set('loose', 'Loose'),
      { id: 'i', name: 'Instance', type: 'INSTANCE' },
      { id: 's', name: '⚛️ Atoms', type: 'SECTION', children: [set('btn', 'Button'), doc(set('deep', 'Deep'))] },
      { id: 'j', name: 'Jira', type: 'SECTION', children: [set('ticket', 'Ticket Row')] },
    ] }
    const placed = placeComponents({ kind: 'legacy', pages: [page] }, [legacyPage])
    expect(placed.map((p) => [p.node.id, p.tier, p.group])).toEqual([['loose', null, null], ['btn', 'Atoms', null], ['ticket', 'Jira', null]])
    expect(placed.filter((p) => inCoverage('legacy', p)).map((p) => p.node.id)).toEqual(['btn'])
  })

  it('counts every component on a tier page towards coverage', () => {
    expect(inCoverage('tiered', { node: set('x', 'X'), tier: 'Icons', group: 'Icon sets' })).toBe(true)
  })
})
