// The local sync, on fixtures only — no network, no Figma.
import { describe, it, expect } from 'vitest'
import { readCommitted, mergeCommitted, type Snapshot } from '../../scripts/figma-pull'
import { compare, renderReport, spliceSets, type Baseline } from '../../scripts/figma-sync'

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T
const NOW = '2026-11-15T09:30:00.000Z'
const rest = (s: Snapshot): Snapshot => ({ ...mergeCommitted(clone(s)), source: 'figma-rest' })
const baselineOf = (s: Snapshot, committedHash = 'h'): Baseline => ({ committedHash, takenAt: NOW, components: clone(s.components), icons: clone(s.icons) })
const button = (s: Snapshot) => s.components.sets.find((x) => x.code === 'Button')!

describe('figma:sync compare', () => {
  it('takes the baseline on the first run and compares no layers', () => {
    const committed = readCommitted()
    const live = rest(committed)
    button(live).variants[0]!.nodes[0]!.b = { ...button(live).variants[0]!.nodes[0]!.b, fill: 'surface/danger' }
    const result = compare(committed, live, undefined, 'h', NOW)
    expect(result.baselineReset).toBe(true)
    expect(result.findings).toEqual([])
    expect(result.baseline.committedHash).toBe('h')
  })

  it('takes the baseline again once the committed snapshot changed', () => {
    const committed = readCommitted()
    const result = compare(committed, rest(committed), baselineOf(committed, 'old'), 'new', NOW)
    expect(result.baselineReset).toBe(true)
    expect(result.baseline.committedHash).toBe('new')
  })

  it('reports nothing when Figma did not move', () => {
    const committed = readCommitted()
    const live = rest(committed)
    expect(compare(committed, live, baselineOf(live), 'h', NOW)).toMatchObject({ findings: [], baselineReset: false })
  })

  it('reports a rebound layer against the previous REST pull', () => {
    const committed = readCommitted()
    const baseline = baselineOf(rest(committed))
    const live = rest(committed)
    const root = button(live).variants[0]!.nodes[0]!
    root.b = { ...root.b, radius: 'dimension/radius/999' }
    const { findings } = compare(committed, live, baseline, 'h', NOW)
    expect(findings.length).toBeGreaterThan(0)
    expect(findings.every((f) => f.component === 'Button')).toBe(true)
  })

  it('reports a new component property against the committed snapshot, first run included', () => {
    const committed = readCommitted()
    const live = rest(committed)
    button(live).props = { ...button(live).props, 'Number value': { type: 'BOOLEAN', default: false } }
    const { findings } = compare(committed, live, undefined, 'h', NOW)
    expect(findings.map((f) => `${f.kind}:${f.component}:${f.key}`)).toEqual(['prop-added:Button:Number value'])
  })
})

describe('figma:sync spliceSets', () => {
  it('replaces only the named sets and keeps the description and bookkeeping', () => {
    const committed = readCommitted().components
    const live = clone(committed)
    for (const set of live.sets) { set.description = ''; set.name = `${set.name} v2`; delete set.status; delete set.dir }
    const out = spliceSets(committed, live, new Set(['Button']))
    const before = committed.sets.find((s) => s.code === 'Button')!
    const after = out.sets.find((s) => s.code === 'Button')!
    expect(after.name).toBe(`${before.name} v2`)
    expect(after.description).toBe(before.description)
    expect(after.status).toBe(before.status)
    expect(out.sets.filter((s) => s.code !== 'Button')).toEqual(committed.sets.filter((s) => s.code !== 'Button'))
    expect(committed.sets.find((s) => s.code === 'Button')!.name).toBe(before.name)
  })
})

describe('figma:sync spliceSets, new sets', () => {
  it('appends a named set the committed snapshot does not have yet', () => {
    const live = readCommitted().components
    const committed = { ...live, sets: live.sets.filter((s) => s.code !== 'Button') }
    const out = spliceSets(committed, live, new Set(['Button']))
    expect(out.sets.at(-1)!.code).toBe('Button')
    expect(out.sets).toHaveLength(live.sets.length)
    expect(spliceSets(committed, live, new Set(['Checkbox'])).sets.some((s) => s.code === 'Button')).toBe(false)
  })
})

describe('figma:sync renderReport', () => {
  it('says the two agree, and that variables were not checked', () => {
    const committed = readCommitted()
    const live = { ...rest(committed), tokensStale: true }
    const text = renderReport(compare(committed, live, baselineOf(live), 'h', NOW), live, NOW)
    expect(text).toContain('Figma and the snapshot agree.')
    expect(text).toContain('Variables were NOT checked')
  })

  it('groups the findings by component', () => {
    const committed = readCommitted()
    const live = rest(committed)
    button(live).props = { ...button(live).props, 'Number value': { type: 'BOOLEAN', default: false } }
    const text = renderReport(compare(committed, live, baselineOf(rest(committed)), 'h', NOW), live, NOW)
    expect(text).toContain('**1 change(s)** in 1 component(s): Button.')
    expect(text).toContain('## Button')
  })
})

describe('figma:sync schedule', () => {
  it('writes one launchd slot per weekday and escapes the command', async () => {
    const { plist, parseTime } = await import('../../scripts/figma-sync-schedule')
    const text = plist('/Users/a b/repo & co', '/tmp/x.log', parseTime('08:15'))
    expect(text.match(/<key>Weekday<\/key>/g)).toHaveLength(5)
    expect(text).toContain('<key>Hour</key><integer>8</integer><key>Minute</key><integer>15</integer>')
    expect(text).toContain('cd "/Users/a b/repo &amp; co" &amp;&amp; npm run --silent figma:sync -- --notify')
  })
  it('rejects a time that is not HH:MM', async () => {
    const { parseTime } = await import('../../scripts/figma-sync-schedule')
    expect(() => parseTime('25:00')).toThrow('--at must be HH:MM')
    expect(() => parseTime('9am')).toThrow('--at must be HH:MM')
  })
})
