import { describe, it, expect } from 'vitest'
import { SAMPLE_VERSIONS, sampleEntries } from '../fixtures'
import { normalizeHex, parseQuery, searchEntries, searchVersions } from '../search'

const NOW = new Date('2026-11-12T12:00:00')
const ENTRIES = sampleEntries(NOW)
const ids = (q: string) => searchEntries(ENTRIES, parseQuery(q)!).map((m) => m.entry.id)
const hitsOf = (q: string, id: string) => searchEntries(ENTRIES, parseQuery(q)!).find((m) => m.entry.id === id)?.hits ?? []

describe('parseQuery', () => {
  it('is null for an empty or blank query', () => {
    expect(parseQuery('')).toBeNull()
    expect(parseQuery('   ')).toBeNull()
  })

  it('reads a Jira key in any case', () => {
    expect(parseQuery(' bb-342 ')).toEqual({ kind: 'ticket', raw: 'bb-342', value: 'BB-342' })
  })

  it('reads colour codes with or without #, short or with alpha', () => {
    expect(parseQuery('#0978c8')).toMatchObject({ kind: 'color', value: '#0978C8' })
    expect(parseQuery('0978C8')).toMatchObject({ kind: 'color', value: '#0978C8' })
    expect(parseQuery('#fff')).toMatchObject({ kind: 'color', value: '#FFFFFF' })
    expect(parseQuery('#FFFFFF1A')).toMatchObject({ kind: 'color', value: '#FFFFFF1A' })
  })

  it('does not take a short word made of hex letters for a colour', () => {
    expect(parseQuery('bad')).toMatchObject({ kind: 'component' })
    expect(parseQuery('Facade')).toMatchObject({ kind: 'component' })
  })

  it('reads a variable path, dropping a "Collection ›" prefix', () => {
    expect(parseQuery('Button/BG/Primary')).toEqual({ kind: 'variable', raw: 'Button/BG/Primary', value: 'button/bg/primary' })
    expect(parseQuery('Brand UI › button/bg/primary')).toMatchObject({ kind: 'variable', value: 'button/bg/primary' })
  })

  it('treats anything else as a component name', () => {
    expect(parseQuery('Date picker')).toEqual({ kind: 'component', raw: 'Date picker', value: 'date picker' })
  })
})

describe('normalizeHex', () => {
  it('expands, upper-cases and drops an opaque alpha', () => {
    expect(normalizeHex('#abc')).toBe('#AABBCC')
    expect(normalizeHex('#0978c8ff')).toBe('#0978C8')
    expect(normalizeHex('not a colour')).toBeNull()
  })
})

describe('searchEntries', () => {
  it('finds a ticket’s entry and lists everything it changed', () => {
    expect(ids('BB-342')).toEqual(['ex1button'])
    const hits = hitsOf('bb-342', 'ex1button')
    expect(hits.filter((h) => h.kind === 'change')).toHaveLength(6)
  })

  it('finds a colour in old and new values', () => {
    expect(ids('#0978C8')).toEqual(['ex1button', 'cl1toggle'])
    const [hit] = hitsOf('#0c8ce9', 'ex1button')
    expect(hit).toMatchObject({ kind: 'change', change: 'modified', row: { name: 'button/bg/primary' } })
  })

  it('finds a colour written in text, such as a UX AI answer', () => {
    const hits = hitsOf('#8A8A8A', 'ux1disabl')
    expect(hits).toEqual([expect.objectContaining({ kind: 'text', where: 'Conversation' })])
  })

  it('finds a variable path, exact or by prefix', () => {
    expect(ids('button/bg/primary')).toEqual(['ex1button', 'cl1toggle'])
    const byPrefix = hitsOf('button/bg', 'ex1button')
    expect(byPrefix.some((h) => h.kind === 'change' && h.row.name === 'button/bg/primary')).toBe(true)
  })

  it('lists the components a variable change impacted', () => {
    const hits = hitsOf('text/secondary', 'ex1button')
    expect(hits.map((h) => h.kind)).toEqual(['change', 'item'])
  })

  it('finds a component: its own changes and the variables it uses', () => {
    expect(ids('Toggle')).toEqual(['ex1button', 'cl1toggle'])
    const hits = hitsOf('toggle', 'ex1button')
    expect(hits.some((h) => h.kind === 'change' && h.row.name === 'surface/translucent')).toBe(true)
    expect(hits.some((h) => h.kind === 'item' && h.title === 'Toggle')).toBe(true)
  })

  it('matches a component as a whole word, not inside another name', () => {
    expect(ids('Tab')).toEqual(['ex1button'])
    expect(hitsOf('Tab', 'ex1button').every((h) => h.kind !== 'change' || /\bTab\b/.test(h.row.note ?? ''))).toBe(true)
  })

  it('finds a component changed in a changelog', () => {
    const sample = searchEntries(ENTRIES, parseQuery('Button')!)
    expect(sample.map((m) => m.entry.id)).toContain('ex1button')
  })

  it('returns nothing for a query nobody touched', () => {
    expect(ids('Carousel')).toEqual([])
    expect(ids('#123456')).toEqual([])
    expect(ids('ZZ-1')).toEqual([])
  })
})

describe('searchVersions', () => {
  const versions = SAMPLE_VERSIONS(NOW)
  const found = (q: string) => searchVersions(versions, q).map((v) => v.id)

  it('matches the name, description or author, in any case', () => {
    expect(found('filter chip')).toEqual(['6004'])
    expect(found('feedback/info')).toEqual(['6012'])
    expect(found('anita')).toEqual(['6010', '6007'])
  })

  it('needs every word, in any order', () => {
    expect(found('anita spacing')).toEqual(['6007'])
    expect(found('spacing ravi')).toEqual([])
  })

  it('finds autosaves by the word Autosave', () => {
    expect(found('autosave')).toEqual(['6011', '6010'])
  })

  it('returns every version for a blank query', () => {
    expect(found('  ')).toHaveLength(versions.length)
  })
})
