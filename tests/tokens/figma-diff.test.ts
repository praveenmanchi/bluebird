// The differ, on fixtures only — no network, no Figma.
//
// The self-diff case is the important one: it validates the whole exclusion list
// (pulledAt, coverage, status/aliasOf/dir, variant.id) in a single assertion. If it
// ever goes non-zero, mergeCommitted or the ignore list is wrong and every real run
// will be buried in the tool's own bookkeeping.
import { describe, it, expect } from 'vitest'
import { readCommitted, mergeCommitted } from '../../scripts/figma-pull'
import { diffSnapshots } from '../../scripts/figma-diff'
import { matchNodes } from '../../scripts/figma-diff-nodes'
import type { ComponentNode } from '../../src/shared/brand/snapshot'

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T
const node = (p: string, t: string, b: Record<string, string> = {}, r?: Record<string, unknown>): ComponentNode => ({ p, t, b, ...(r ? { r } : {}) })

describe('diffSnapshots', () => {
  it('reports nothing when the committed snapshot is diffed against itself', () => {
    expect(diffSnapshots(readCommitted(), mergeCommitted(clone(readCommitted())))).toEqual([])
  })

  it('ignores pulledAt', () => {
    const before = readCommitted()
    const after = mergeCommitted(clone(before))
    after.components.pulledAt = '2099-01-01'
    after.tokens.pulledAt = '2099-01-01'
    after.tokens.source = 'figma-rest'
    expect(diffSnapshots(before, after)).toEqual([])
  })

  it('reports a geometry change, a new property and a rebound fill', () => {
    // The committed Header padding is bound now, so start from a raw one: the case under test is a raw value moving.
    const before = clone(readCommitted())
    const rawHeader = before.components.sets.find((s) => s.code === 'WcagCard')!.variants[0]!.nodes.find((n) => n.p === 'Mode=colors/Header')!
    delete rawHeader.b.paddingBottom
    rawHeader.r = { ...rawHeader.r, paddingBottom: 2 }
    const after = mergeCommitted(clone(before))
    const set = after.components.sets.find((s) => s.code === 'WcagCard')!
    const variant = set.variants[0]!
    const header = variant.nodes.find((n) => n.p === 'Mode=colors/Header')!
    header.r = { ...header.r, paddingBottom: 4 }
    set.props['New Toggle'] = { type: 'BOOLEAN', default: true }
    variant.nodes.find((n) => n.p === 'Mode=colors/Header/Frame 1430102696/Rating')!.b.fill = 'rating/icon/color'

    const findings = diffSnapshots(before, after)
    const raw = findings.find((f) => f.kind === 'raw-changed' && f.path === 'Mode=colors/Header')
    expect(raw).toMatchObject({ key: 'paddingBottom', before: 2, after: 4 })
    expect(findings.find((f) => f.kind === 'prop-added')).toMatchObject({ component: 'WcagCard', key: 'New Toggle' })
    expect(findings.find((f) => f.kind === 'binding-rebound')).toMatchObject({ key: 'fill', after: 'rating/icon/color', vars: ['--bb-rating-icon-color'] })
    // The padding lands on real generated tokens and the differ says so. Changing it in one variant
    // only makes the value non-uniform, so the flat token splits into per-variant ones — which is
    // why the assertion is on the set of derived findings rather than a single `derived-changed`.
    const derived = findings.filter((f) => f.kind.startsWith('derived-') && f.vars?.[0]?.includes('header-padding-bottom'))
    expect(derived.length).toBeGreaterThan(0)
    expect(derived.some((f) => f.after === '4px' || f.before === '2px')).toBe(true)
  })

  it('collapses a renamed Figma property instead of reporting add + remove', () => {
    const before = readCommitted()
    const after = mergeCommitted(clone(before))
    const set = after.components.sets.find((s) => s.code === 'WcagCard')!
    set.props['Required value'] = set.props.Required!
    delete set.props.Required
    const findings = diffSnapshots(before, after).filter((f) => f.kind.startsWith('prop-'))
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({ kind: 'prop-renamed', before: 'Required', after: 'Required value' })
  })

  it('reports a renamed container once, not once per descendant', () => {
    const before = readCommitted()
    const after = mergeCommitted(clone(before))
    const variant = after.components.sets.find((s) => s.code === 'WcagCard')!.variants[0]!
    const descendants = variant.nodes.filter((n) => n.p.startsWith('Mode=colors/Header/')).length
    expect(descendants).toBeGreaterThan(2)
    for (const n of variant.nodes) {
      if (n.p === 'Mode=colors/Header') n.p = 'Mode=colors/Head'
      else if (n.p.startsWith('Mode=colors/Header/')) n.p = `Mode=colors/Head/${n.p.slice('Mode=colors/Header/'.length)}`
    }
    const findings = diffSnapshots(before, after).filter((f) => f.kind.startsWith('node-'))
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({ kind: 'node-renamed', before: 'Mode=colors/Header', after: 'Mode=colors/Head' })
  })

  it('reports a variable value change against the CSS var it generates', () => {
    const before = readCommitted()
    const after = mergeCommitted(clone(before))
    const brand = after.tokens.collections.find((c) => c.key === 'brand')!
    const variable = brand.variables.find((v) => v.name === 'button/primary/bg/default')!
    variable.values[brand.modes[0]!] = '#ff0000'
    const finding = diffSnapshots(before, after).find((f) => f.kind === 'variable-changed')
    expect(finding).toMatchObject({ after: '#ff0000', vars: ['--bb-button-primary-bg-default'], read: true })
  })

  it('skips variables entirely when the pull could not reach them', () => {
    const before = readCommitted()
    const after = mergeCommitted(clone(before))
    after.tokensStale = true
    after.tokens.collections[0]!.variables[0]!.values = { nonsense: '#000000' }
    expect(diffSnapshots(before, after)).toEqual([])
  })
})

describe('matchNodes', () => {
  it('matches identical trees by path', () => {
    const nodes = [node('Root', 'COMPONENT'), node('Root/A', 'FRAME', { fill: 'x/y' })]
    const m = matchNodes(nodes, clone(nodes))
    expect(m.pairs).toHaveLength(2)
    expect([m.renames, m.added, m.removed]).toEqual([[], [], []])
  })

  it('propagates a rename to the whole subtree', () => {
    const before = [node('R', 'COMPONENT'), node('R/Box', 'FRAME', { fill: 'a/b' }), node('R/Box/Label', 'TEXT', { fill: 'c/d' })]
    const after = [node('R', 'COMPONENT'), node('R/Card', 'FRAME', { fill: 'a/b' }), node('R/Card/Label', 'TEXT', { fill: 'c/d' })]
    const m = matchNodes(before, after)
    expect(m.renames).toHaveLength(1)
    expect(m.renames[0]!.after.p).toBe('R/Card')
    expect(m.renames[0]!.confidence).toBe('exact') // identical bindings: certainly the same layer
    expect(m.pairs.map((p) => p.after.p)).toContain('R/Card/Label')
    expect([m.added, m.removed]).toEqual([[], []])
  })

  it('does not pair layers of different types', () => {
    const m = matchNodes([node('R', 'COMPONENT'), node('R/A', 'TEXT')], [node('R', 'COMPONENT'), node('R/B', 'VECTOR')])
    expect(m.renames).toEqual([])
    expect(m.added.map((n) => n.p)).toEqual(['R/B'])
    expect(m.removed.map((n) => n.p)).toEqual(['R/A'])
  })

  it('flags a weakly-evidenced rename as heuristic', () => {
    const before = [node('R', 'COMPONENT'), node('R/A', 'FRAME', {}, { layout: 'VERTICAL' })]
    const after = [node('R', 'COMPONENT'), node('R/B', 'FRAME', {}, { layout: 'VERTICAL' })]
    const m = matchNodes(before, after)
    expect(m.renames[0]).toMatchObject({ confidence: 'heuristic' })
  })
})

describe('matchNodes with node ids', () => {
  const withId = (id: string, p: string, t: string, b: Record<string, string> = {}): ComponentNode => ({ id, p, t, b })

  it('pairs layers by id and reports a renamed container once, not per descendant', () => {
    const before = [withId('1', 'R', 'COMPONENT'), withId('2', 'R/Header', 'FRAME'), withId('3', 'R/Header/Title', 'TEXT'), withId('4', 'R/Header/Icon', 'INSTANCE')]
    const after = [withId('1', 'R', 'COMPONENT'), withId('2', 'R/Head', 'FRAME'), withId('3', 'R/Head/Title', 'TEXT'), withId('4', 'R/Head/Icon', 'INSTANCE')]
    const m = matchNodes(before, after)
    expect(m.renames).toHaveLength(1)
    expect(m.renames[0]).toMatchObject({ before: { p: 'R/Header' }, after: { p: 'R/Head' }, confidence: 'exact' })
    expect(m.pairs).toHaveLength(3)
    expect(m.added).toEqual([])
    expect(m.removed).toEqual([])
  })

  it('catches a rename the heuristics would miss: renamed and rebound in one edit', () => {
    const m = matchNodes([withId('1', 'R', 'COMPONENT'), withId('2', 'R/A', 'FRAME', { fill: 'x' })], [withId('1', 'R', 'COMPONENT'), withId('2', 'R/B', 'FRAME', { fill: 'y' })])
    expect(m.renames.map((r) => [r.before.p, r.after.p])).toEqual([['R/A', 'R/B']])
  })

  it('reports a layer moved to another parent, and new or deleted ids as added / removed', () => {
    const before = [withId('1', 'R', 'COMPONENT'), withId('2', 'R/A', 'FRAME'), withId('3', 'R/B', 'FRAME'), withId('4', 'R/A/Dot', 'ELLIPSE'), withId('5', 'R/Old', 'TEXT')]
    const after = [withId('1', 'R', 'COMPONENT'), withId('2', 'R/A', 'FRAME'), withId('3', 'R/B', 'FRAME'), withId('4', 'R/B/Dot', 'ELLIPSE'), withId('6', 'R/New', 'TEXT')]
    const m = matchNodes(before, after)
    expect(m.renames.map((r) => [r.before.p, r.after.p])).toEqual([['R/A/Dot', 'R/B/Dot']])
    expect(m.added.map((n) => n.p)).toEqual(['R/New'])
    expect(m.removed.map((n) => n.p)).toEqual(['R/Old'])
  })

  it('falls back to paths when the baseline predates node ids', () => {
    const m = matchNodes([node('R', 'COMPONENT'), node('R/A', 'FRAME')], [withId('1', 'R', 'COMPONENT'), withId('2', 'R/A', 'FRAME')])
    expect(m.pairs).toHaveLength(2)
    expect(m.renames).toEqual([])
  })
})
