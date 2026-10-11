import { describe, it, expect } from 'vitest'
import { applyChanges, countKinds, diffSnapshots } from '../diff'
import { BASELINE, CURRENT } from '../fixtures'
import { bumpVersion, parseVersion, suggestBump, suggestionReason, versionOptions } from '../semver'
import { changelogMarkdown, draftNote, draftTitle } from '../notes'
import type { Snapshot } from '../types'

const byName = (name: string) => diffSnapshots(BASELINE, CURRENT).find((c) => c.name === name)!

describe('diffSnapshots', () => {
  it('reproduces the Figma example: 12 changes — 3 added, 7 modified, 1 removed, 1 deprecated', () => {
    const changes = diffSnapshots(BASELINE, CURRENT)
    expect(changes).toHaveLength(12)
    expect(countKinds(changes)).toEqual({ added: 3, modified: 7, removed: 1, deprecated: 1 })
    expect(changes.filter((c) => c.subject === 'variable')).toHaveLength(8)
    expect(changes.filter((c) => c.subject === 'component')).toHaveLength(4)
  })
  it('puts breaking changes first', () => {
    const [first, second] = diffSnapshots(BASELINE, CURRENT)
    expect(first!.breaking && second!.breaking).toBe(true)
    expect([first!.name, second!.name].sort()).toEqual(['Button', 'surface/translucent'])
  })
  it('describes a colour that changed in some brands with per-mode values', () => {
    const c = byName('button/bg/primary')
    expect(c.kind).toBe('modified')
    expect(c.detail).toBe('#0C8CE9 → #0560A3 · 3 of 5 brands')
    expect(c.swatch).toBe('#0560A3')
    expect(c.modeValues.filter((m) => m.state === 'changed').map((m) => m.mode)).toEqual(['Bridge', 'Ikea', 'Richemont'])
    expect(c.modeValues.find((m) => m.mode === 'Disney')).toEqual({ mode: 'Disney', state: 'unchanged', kind: 'color', value: '#0C8CE9' })
    expect(c.usedIn).toEqual(['Button', 'Tab', 'Toggle', 'Date picker'])
    expect(c.source).toBe('Brand UI › button/bg/primary')
  })
  it('says "all brands" when every mode moved the same way', () => {
    expect(byName('radius/control').detail).toBe('6 → 8 · all brands')
    expect(byName('radius/control').preview).toBe('number')
  })
  it('flags a removed variable as breaking and lists who used it', () => {
    const c = byName('surface/translucent')
    expect(c).toMatchObject({ kind: 'removed', breaking: true, detail: 'Removed · used by 4 components' })
    expect(c.usedIn).toEqual(['Tooltip', 'Modal', 'Popover', 'Sheet'])
  })
  it('reads new variables and components', () => {
    expect(byName('feedback/info')).toMatchObject({ kind: 'added', detail: 'New · #007BE5', breaking: false })
    expect(byName('Date picker')).toMatchObject({ kind: 'added', preview: 'component', detail: 'New · 6 variants · 4 properties' })
  })
  it('treats a removed component property as breaking and names the swap', () => {
    expect(byName('Button')).toMatchObject({ kind: 'modified', breaking: true, detail: '+1 variant · Label → Text' })
  })
  it('detects deprecation from the description and plain description edits', () => {
    expect(byName('Tooltip')).toMatchObject({ kind: 'deprecated', breaking: false, detail: 'Deprecated — use Popover.' })
    expect(byName('Card')).toMatchObject({ kind: 'modified', detail: 'Description updated' })
  })
  it('treats a rename (same variable id) as a breaking modification, not remove + add', () => {
    const renamed: Snapshot = { ...BASELINE, variables: BASELINE.variables.map((v) => v.id === 'v6' ? { ...v, name: 'text/anchor' } : v) }
    const changes = diffSnapshots(BASELINE, renamed)
    expect(changes).toHaveLength(1)
    expect(changes[0]).toMatchObject({ kind: 'modified', breaking: true, name: 'text/anchor', detail: 'Renamed from text/link' })
  })
  it('returns nothing for identical snapshots and everything for a first release', () => {
    expect(diffSnapshots(BASELINE, BASELINE)).toEqual([])
    const first = diffSnapshots(null, CURRENT)
    expect(first).toHaveLength(CURRENT.variables.length + CURRENT.components.length)
    expect(first.every((c) => c.kind === 'added')).toBe(true)
  })
})

describe('applyChanges', () => {
  it('moves only the included changes into the next baseline', () => {
    const changes = diffSnapshots(BASELINE, CURRENT)
    const excluded = 'variable:v6' // text/link stays unpublished
    const next = applyChanges(BASELINE, CURRENT, new Set(changes.map((c) => c.id).filter((id) => id !== excluded)))
    const left = diffSnapshots(next, CURRENT)
    expect(left.map((c) => c.id)).toEqual([excluded])
  })
  it('includes everything when every change is included', () => {
    const changes = diffSnapshots(BASELINE, CURRENT)
    expect(diffSnapshots(applyChanges(BASELINE, CURRENT, new Set(changes.map((c) => c.id))), CURRENT)).toEqual([])
  })
})

describe('semver', () => {
  it('parses and bumps versions', () => {
    expect(parseVersion('v3.0.0')).toEqual([3, 0, 0])
    expect(parseVersion('junk')).toEqual([0, 0, 0])
    expect(bumpVersion('v3.0.0', 'patch')).toBe('v3.0.1')
    expect(bumpVersion('v3.0.0', 'minor')).toBe('v3.1.0')
    expect(bumpVersion('v3.0.0', 'major')).toBe('v4.0.0')
    expect(bumpVersion(null, 'major')).toBe('v1.0.0')
  })
  it('suggests major for breaking changes, minor for additions, patch for value tweaks', () => {
    const changes = diffSnapshots(BASELINE, CURRENT)
    expect(suggestBump(changes, false)).toBe('major')
    expect(suggestBump(changes.filter((c) => !c.breaking), false)).toBe('minor')
    expect(suggestBump(changes.filter((c) => c.kind === 'modified' && !c.breaking), false)).toBe('patch')
    expect(suggestBump([], true)).toBe('major')
  })
  it('explains the suggestion', () => {
    const changes = diffSnapshots(BASELINE, CURRENT)
    expect(suggestionReason(changes, false, 'v3.0.0')).toBe('Suggested because surface/translucent was removed. Sites pinned to v3 keep working.')
    expect(suggestionReason(changes.filter((c) => c.kind !== 'removed'), false, 'v3.0.0')).toBe('Suggested because Button lost a component property. Sites pinned to v3 keep working.')
    expect(suggestionReason([], true, null)).toBe('Suggested because this is the first release of this file.')
  })
  it('lists the three options from the current version', () => {
    expect(versionOptions('v3.0.0').map((o) => o.version)).toEqual(['v3.0.1', 'v3.1.0', 'v4.0.0'])
  })
})

describe('notes', () => {
  it('drafts a sentence per change', () => {
    expect(draftNote(byName('button/bg/primary'))).toBe('button/bg/primary changed from #0C8CE9 to #0560A3 in Bridge, Ikea and Richemont.')
    expect(draftNote(byName('text/secondary'))).toBe('text/secondary changed from #A4A4A4 to #C4C4C4 in all brands.')
    expect(draftNote(byName('surface/translucent'))).toBe('Removed surface/translucent. Tooltip, Modal, Popover and Sheet used it — point them at a replacement before updating.')
    expect(draftNote(byName('Date picker'))).toBe('New component: Date picker (6 variants · 4 properties).')
    expect(draftNote(byName('Tooltip'))).toBe('Tooltip is deprecated — use Popover.')
  })
  it('drafts a title from the notable changes', () => {
    const changes = diffSnapshots(BASELINE, CURRENT)
    expect(draftTitle(changes)).toBe('Button, Date picker and 10 more')
    expect(draftTitle([])).toBe('')
  })
  it('renders the changelog grouped by kind', () => {
    const c = byName('surface/translucent')
    expect(changelogMarkdown('v4.0.0', 'Cleanup', [{ change: c, text: 'Gone.' }])).toBe('## v4.0.0 — Cleanup\n\n### Breaking\n- **surface/translucent** — Gone.\n')
  })
})
