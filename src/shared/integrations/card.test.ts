import { describe, expect, it } from 'vitest'
import type { Change, ModeValue } from '@shared/design/types'
import { MAX_CARD_CHANGES, NONE, cardChange, cardChanges, cardPayload, channelCard, linkLine, type CardFacts } from './card'

const changed = (mode: string, old: string, now: string): ModeValue => ({ mode, state: 'changed', kind: 'color', old, new: now })
const same = (mode: string, value: string): ModeValue => ({ mode, state: 'unchanged', kind: 'color', value })

function change(over: Partial<Change> = {}): Change {
  return {
    id: 'variable:1', subject: 'variable', kind: 'modified', preview: 'color', name: 'button/bg/primary',
    detail: '', breaking: false, modeValues: [changed('Gap', '#0C8CE9', '#0560A3')], usedIn: ['Button', 'Chip'], source: 'Brand UI › button/bg/primary',
    ...over,
  }
}

const FACTS: CardFacts = { kind: 'extraction', actor: 'Designer', repo: 'acme/tokens', ref: 'tokens/update', added: 1, modified: 1, removed: 1, breaking: 1, impacted: ['Button'] }

describe('cardChange', () => {
  it('shows the one old → new pair a modified variable moved by, and pre-joins usedIn', () => {
    expect(cardChange(change({ modeValues: [changed('Gap', '#0C8CE9', '#0560A3'), changed('Old Navy', '#0C8CE9', '#0560A3'), same('Athleta', '#111111')] })))
      .toEqual({ name: 'button/bg/primary', kind: 'modified', from: '#0C8CE9', to: '#0560A3', usedIn: 'Button, Chip', breaking: false })
  })

  it('puts — on both sides when the modes moved differently', () => {
    const row = cardChange(change({ modeValues: [changed('Gap', '#0C8CE9', '#0560A3'), changed('Old Navy', '#222222', '#333333')] }))
    expect([row.from, row.to]).toEqual([NONE, NONE])
  })

  it('uses — for the side that does not exist on an added or removed variable', () => {
    expect(cardChange(change({ kind: 'added', modeValues: [same('Gap', '#FFFFFF'), same('Old Navy', '#FFFFFF')], usedIn: [] })))
      .toMatchObject({ from: NONE, to: '#FFFFFF', usedIn: NONE })
    expect(cardChange(change({ kind: 'removed', breaking: true, modeValues: [same('Gap', '#0C8CE9')] })))
      .toMatchObject({ from: '#0C8CE9', to: NONE, breaking: true })
    expect(cardChange(change({ kind: 'added', modeValues: [same('Gap', '#FFFFFF'), same('Old Navy', '#000000')] })).to).toBe(NONE)
  })

  it('keeps the value on both sides of a rename and — for a component', () => {
    expect(cardChange(change({ breaking: true, modeValues: [same('Gap', '#0C8CE9')] }))).toMatchObject({ from: '#0C8CE9', to: '#0C8CE9' })
    expect(cardChange(change({ subject: 'component', preview: 'component', modeValues: [], usedIn: [] }))).toMatchObject({ from: NONE, to: NONE, usedIn: NONE })
  })
})

describe('cardChanges', () => {
  it('sorts breaking rows first and caps the table, so truncation never hides one', () => {
    const many = Array.from({ length: MAX_CARD_CHANGES + 5 }, (_, i) => change({ id: `variable:${i}`, name: `v/${String(i).padStart(2, '0')}`, breaking: i === MAX_CARD_CHANGES + 4 }))
    const { rows, total } = cardChanges(many)
    expect(rows).toHaveLength(MAX_CARD_CHANGES)
    expect(total).toBe(MAX_CARD_CHANGES + 5)
    expect(rows[0]!.name).toBe(`v/${MAX_CARD_CHANGES + 4}`)
    expect(rows[1]!.name).toBe('v/00') // otherwise in the order given
  })
})

describe('linkLine', () => {
  it('is a bare URL: Teams prints [label](url) literally', () => {
    expect(linkLine('https://github.com/a/b/pull/1', 'Open pull request')).toBe('Open pull request: https://github.com/a/b/pull/1')
  })
})

describe('cardPayload', () => {
  it('keeps title and text first, then the discrete keys a flow reads', () => {
    const body = JSON.parse(cardPayload({ title: 'T', lines: ['a', 'b'], facts: FACTS, changes: [change(), change({ kind: 'removed', breaking: true })], link: 'https://x.test/pr', linkLabel: 'Open pull request' })) as Record<string, unknown>
    expect(Object.keys(body).slice(0, 5)).toEqual(['@type', '@context', 'summary', 'title', 'text'])
    expect(body.text).toBe('a\n\nb\n\nOpen pull request: https://x.test/pr')
    expect(body).toMatchObject({ themeColor: 'D64045', kind: 'extraction', actor: 'Designer', repo: 'acme/tokens', ref: 'tokens/update', added: 1, modified: 1, removed: 1, breaking: 1, impacted: ['Button'], notify: 'channel', changesShown: 2, changesTotal: 2, link: 'https://x.test/pr', linkLabel: 'Open pull request' })
    expect((body.changes as Array<{ kind: string }>)[0]!.kind).toBe('removed')
    expect(body).not.toHaveProperty('potentialAction')
  })

  it('omits the table keys with nothing to tabulate, and only tags the channel for a breaking change', () => {
    const body = JSON.parse(cardPayload({ title: 'T', lines: ['a'], facts: { ...FACTS, breaking: 0, actor: '' }, changes: [] })) as Record<string, unknown>
    expect(body).not.toHaveProperty('changes')
    expect(body).not.toHaveProperty('changesShown')
    expect(body).not.toHaveProperty('changesTotal')
    expect(body).not.toHaveProperty('actor')
    expect(body).not.toHaveProperty('link')
    expect(body).toMatchObject({ notify: 'none', themeColor: '0C8CE9' })
  })

  it('channelCard is the plain card: title, paragraphs and the link line', () => {
    const body = JSON.parse(channelCard('Review', ['one'], 'https://www.figma.com/file/x', 'Open the Figma branch')) as Record<string, unknown>
    expect(body).toMatchObject({ '@type': 'MessageCard', title: 'Review', text: 'one\n\nOpen the Figma branch: https://www.figma.com/file/x', link: 'https://www.figma.com/file/x' })
    expect(body).not.toHaveProperty('kind')
  })
})
