import { describe, it, expect } from 'vitest'
import { BASELINE, CURRENT } from '../fixtures'
import { isBranchName } from '../messages'
import {
  countKinds, diffJson, draftMessage, impactedComponents, modeCounts, nextIndex, parseExtraction, parseIndex, stampPath, variableChanges,
  MAX_INDEX, type IndexEntry,
} from '../model'

const changes = variableChanges(BASELINE, CURRENT)
const entry = (at: string): IndexEntry => ({ at, by: 'Praveen', file: 'Bluebird UI', path: stampPath(at), variables: 6, components: 6, message: 'm' })

describe('extraction model', () => {
  it('lists variable changes only: 2 added, 3 modified, 1 removed', () => {
    expect(changes.every((c) => c.subject === 'variable')).toBe(true)
    expect(countKinds(changes)).toEqual({ added: 2, modified: 3, removed: 1 })
  })

  it('treats everything as added when the branch has no extraction', () => {
    const first = variableChanges(null, CURRENT)
    expect(first).toHaveLength(CURRENT.variables.length)
    expect(countKinds(first).added).toBe(CURRENT.variables.length)
  })

  it('counts changes per brand mode, only where the value changed', () => {
    const byMode = Object.fromEntries(modeCounts(changes).map((m) => [m.mode, m]))
    // button/bg/primary changed in Bridge and Ikea but not in Gap.
    expect(byMode.Bridge).toMatchObject({ added: 2, modified: 3, removed: 1 })
    expect(byMode.Gap).toMatchObject({ added: 2, modified: 2, removed: 1 })
  })

  it('finds the components behind each changed variable, breaking ones first', () => {
    const impacted = impactedComponents(changes, BASELINE, CURRENT)
    expect(impacted.map((c) => c.name)).toEqual(['Toggle', 'Button', 'Date picker', 'Tab'])
    // Toggle no longer binds the removed variable, so it is found through the baseline.
    expect(impacted[0]).toMatchObject({ name: 'Toggle', breaking: true, variables: ['surface/translucent'] })
    expect(impacted.find((c) => c.name === 'Button')!.variables).toEqual(['button/bg/primary', 'radius/control'])
    // Card only uses an unchanged variable; Notice only a new one.
    expect(impacted.some((c) => c.name === 'Card' || c.name === 'Notice')).toBe(false)
  })

  it('drafts the commit message from the counts', () => {
    expect(draftMessage(changes)).toBe('chore(tokens): 6 variable changes — 2 added, 3 modified, 1 removed')
    expect(draftMessage([])).toMatch(/no variable changes/)
  })

  it('names the extraction file by its UTC minute', () => {
    expect(stampPath('2026-11-12T09:32:41.000Z')).toBe('extractions/2026-11-12-0932.json')
  })

  it('round-trips an extraction and rejects anything else', () => {
    const file = { schema: 1, extractedAt: '2026-11-12T09:32:00.000Z', extractedBy: 'Praveen', file: 'Bluebird UI', snapshot: CURRENT }
    expect(parseExtraction(JSON.stringify(file))).toEqual(file)
    for (const raw of [null, '', 'not json', '{}', JSON.stringify({ ...file, snapshot: { variables: 1 } })]) expect(parseExtraction(raw)).toBeNull()
  })

  it('keeps the newest entry first and caps the history', () => {
    let index = nextIndex(null, entry('2026-11-01T00:00:00.000Z'))
    for (let i = 0; i < MAX_INDEX + 5; i++) index = nextIndex(index, entry(new Date(Date.UTC(2026, 10, 2, 0, i)).toISOString()))
    expect(index.history).toHaveLength(MAX_INDEX)
    expect(index.history[0]).toBe(index.latest)
    expect(parseIndex(JSON.stringify(index))!.latest.at).toBe(index.latest.at)
    expect(parseIndex('{"latest":{}}')).toBeNull()
  })

  it('exports the diff as JSON with per-mode values', () => {
    const rows = JSON.parse(diffJson(changes)) as Array<{ name: string; change: string; modes: Record<string, unknown> }>
    const button = rows.find((r) => r.name === 'button/bg/primary')!
    expect(button.modes.Bridge).toEqual({ from: '#0C8CE9', to: '#0978C8' })
    expect(button.modes.Gap).toBe('#0C8CE9')
  })

  it('accepts git branch names and refuses anything that could escape a URL', () => {
    for (const ok of ['main', 'release/v4.0.0', 'extraction/2026-11-12-button-refresh', 'a.b_c']) expect(isBranchName(ok)).toBe(true)
    for (const bad of ['', 'has space', '-lead', '/lead', 'trail/', 'a..b', 'a//b', 'x?y', 'x#y', 'ref.lock', 'a@{b']) expect(isBranchName(bad)).toBe(false)
  })
})
