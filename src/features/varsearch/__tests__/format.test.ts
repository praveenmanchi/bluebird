import { describe, it, expect } from 'vitest'
import {
  cleanPageName, isDividerPage, pageScopeIds, pageScopeLabel, relativeTime, togglePage, toggleType, typesLabel, usagesLabel, variableMeta,
} from '../format'
import { USAGE_KINDS, type Usage } from '../messages'

const PAGES = [{ id: 'a', name: 'Atoms' }, { id: 'b', name: 'Molecules' }, { id: 'c', name: 'Organisms' }]
const u = (kind: Usage['kind']): Usage => ({ id: kind, name: kind, kind, pageId: '', pageName: '', nodeIds: [], count: 1 })

describe('page names', () => {
  it('drops the outline arrow and keeps real names', () => {
    expect(cleanPageName('  ↳ Molecules')).toBe('Molecules')
    expect(cleanPageName('Cover')).toBe('Cover')
  })
  it('treats dash-only pages as dividers', () => {
    expect(isDividerPage('---')).toBe(true)
    expect(isDividerPage('--------- ')).toBe(true)
    expect(isDividerPage('FOUNDATIONS')).toBe(false)
  })
})

describe('page scope', () => {
  it('labels like the Figma trigger', () => {
    expect(pageScopeLabel({ mode: 'all' }, PAGES)).toBe('All Pages')
    expect(pageScopeLabel({ mode: 'current' }, PAGES)).toBe('Current page')
    expect(pageScopeLabel({ mode: 'some', ids: ['b'] }, PAGES)).toBe('Molecules')
    expect(pageScopeLabel({ mode: 'some', ids: ['a', 'b', 'c'].slice(0, 2) }, PAGES)).toBe('2 Pages')
  })
  it('sends no ids for all pages and the current page id for current', () => {
    expect(pageScopeIds({ mode: 'all' }, 'b')).toEqual([])
    expect(pageScopeIds({ mode: 'current' }, 'b')).toEqual(['b'])
  })
  it('narrows from All Pages to the ticked page, then toggles, and falls back to All', () => {
    const ids = PAGES.map((p) => p.id)
    const one = togglePage({ mode: 'all' }, 'b', ids, 'a')
    expect(one).toEqual({ mode: 'some', ids: ['b'] })
    const two = togglePage(one, 'c', ids, 'a')
    expect(two).toEqual({ mode: 'some', ids: ['b', 'c'] })
    expect(togglePage(two, 'a', ids, 'a')).toEqual({ mode: 'all' })
    expect(togglePage(one, 'b', ids, 'a')).toEqual({ mode: 'all' })
    expect(togglePage({ mode: 'current' }, 'b', ids, 'a')).toEqual({ mode: 'some', ids: ['a', 'b'] })
  })
})

describe('types', () => {
  it('narrows from All types, toggles, and falls back to All', () => {
    expect(toggleType([], 'component', USAGE_KINDS)).toEqual(['component'])
    expect(toggleType(['component'], 'frame', USAGE_KINDS)).toEqual(['frame', 'component'])
    expect(toggleType(['component'], 'component', USAGE_KINDS)).toEqual([])
    expect(toggleType(['frame', 'component'], 'text-style', USAGE_KINDS)).toEqual([])
  })
  it('labels the trigger', () => {
    expect(typesLabel([])).toBe('All types')
    expect(typesLabel(['text-style'])).toBe('Text style')
    expect(typesLabel(['frame', 'component'])).toBe('2 types')
  })
})

describe('card copy', () => {
  it('writes the meta line from what uses the variable', () => {
    expect(variableMeta({ collection: 'Brand UI', modes: 7, usages: [u('component'), u('component'), u('frame')] }))
      .toBe('Brand UI · Used by 2 components, 1 frame · Affects 7 modes/brands')
    expect(variableMeta({ collection: 'Primitives', modes: 1, usages: [u('text-style')] }))
      .toBe('Primitives · Used by 1 text style · Affects 1 mode/brands')
  })
  it('names the summary chip after the row kind', () => {
    expect(usagesLabel({ usages: [u('component')] })).toBe('Components')
    expect(usagesLabel({ usages: [u('frame')] })).toBe('Frames')
    expect(usagesLabel({ usages: [u('frame'), u('component')] })).toBe('Used in')
  })
  it('dates recent searches', () => {
    const now = 1_000_000_000_000
    expect(relativeTime(now - 10_000, now)).toBe('Just now')
    expect(relativeTime(now - 5 * 60_000, now)).toBe('5 min ago')
    expect(relativeTime(now - 3 * 3_600_000, now)).toBe('3 h ago')
    expect(relativeTime(now - 30 * 3_600_000, now)).toBe('Yesterday')
    expect(relativeTime(now - 12 * 86_400_000, now)).toBe('12 days ago')
  })
})
