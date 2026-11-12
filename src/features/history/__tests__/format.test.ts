import { describe, expect, it } from 'vitest'
import { changeCounts, countsLabel } from '../format'

describe('changeCounts', () => {
  it('reads the counts out of a card line, in the card’s order: updated, added, removed', () => {
    expect(changeCounts('2 added · 5 modified · 1 removed')).toEqual({
      counts: [{ status: 'updated', count: '5' }, { status: 'added', count: '2' }, { status: 'removed', count: '1' }],
      rest: '',
    })
  })

  it('keeps what is not a count as text', () => {
    expect(changeCounts('3 modified · not pushed')).toEqual({ counts: [{ status: 'updated', count: '3' }], rest: 'not pushed' })
    expect(changeCounts('1,204 updated')).toEqual({ counts: [{ status: 'updated', count: '1,204' }], rest: '' })
  })

  it('leaves lines without added, modified or removed counts alone', () => {
    expect(changeCounts('6 components')).toEqual({ counts: [], rest: '6 components' })
    expect(changeCounts('2 suggested · 1 applied')).toEqual({ counts: [], rest: '2 suggested · 1 applied' })
    expect(changeCounts('1,026 variables · baseline')).toEqual({ counts: [], rest: '1,026 variables · baseline' })
  })
})

describe('countsLabel', () => {
  it('says the line for screen readers', () => {
    expect(countsLabel('Variables', changeCounts('2 added · 5 modified · 1 removed'))).toBe('Variables: 5 updated, 2 added, 1 removed')
    expect(countsLabel('Variables', changeCounts('3 modified · not pushed'))).toBe('Variables: 3 updated, not pushed')
    expect(countsLabel('Components', changeCounts('6 components'))).toBe('Components: 6 components')
  })
})
