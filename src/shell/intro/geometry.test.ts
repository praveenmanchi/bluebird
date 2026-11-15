import { describe, expect, it } from 'vitest'
import { ARROW_GAP, EDGE, TIP_GAP, arrowFor, holeRect, placeCard, unionRect } from './geometry'

const VIEW = { width: 600, height: 760 }
const CARD = { width: 288, height: 160 }

describe('unionRect', () => {
  it('spans every non-empty rect and ignores zero-size ones', () => {
    expect(unionRect([{ x: 10, y: 20, width: 30, height: 40 }, { x: 100, y: 5, width: 10, height: 10 }, { x: 0, y: 0, width: 0, height: 50 }]))
      .toEqual({ x: 10, y: 5, width: 100, height: 55 })
  })
  it('is null when nothing is visible', () => {
    expect(unionRect([])).toBeNull()
    expect(unionRect([{ x: 1, y: 1, width: 0, height: 0 }])).toBeNull()
  })
})

describe('holeRect', () => {
  it('grows the target by the padding and keeps it inside the view', () => {
    expect(holeRect({ x: 10, y: 10, width: 50, height: 20 }, 4, VIEW)).toEqual({ x: 6, y: 6, width: 58, height: 28 })
    expect(holeRect({ x: 0, y: 740, width: 600, height: 20 }, 4, VIEW)).toEqual({ x: 0, y: 736, width: 600, height: 24 })
  })
})

describe('placeCard', () => {
  it('goes below a target near the top, centred on it and clamped to the edges', () => {
    const p = placeCard({ x: 10, y: 120, width: 120, height: 40 }, CARD, VIEW)
    expect(p.side).toBe('below')
    expect(p.y).toBe(120 + 40 + ARROW_GAP)
    expect(p.x).toBe(EDGE)
  })
  it('goes above a footer target, keeping clear of the reserved strip', () => {
    const p = placeCard({ x: 500, y: 734, width: 28, height: 24 }, CARD, VIEW, 27)
    expect(p.side).toBe('above')
    expect(p.y).toBe(734 - ARROW_GAP - CARD.height)
    expect(p.x).toBe(VIEW.width - EDGE - CARD.width)
  })
  it('goes beside a tall narrow target', () => {
    const p = placeCard({ x: 20, y: 150, width: 200, height: 560 }, CARD, VIEW)
    expect(p.side).toBe('right')
    expect(p.x).toBe(20 + 200 + ARROW_GAP)
  })
  it('covers the lower part of a target that fills the view, above the footer', () => {
    const p = placeCard({ x: 0, y: 150, width: 600, height: 580 }, CARD, VIEW, 27)
    expect(p.side).toBe('center')
    expect(p.y + CARD.height).toBeLessThanOrEqual(VIEW.height - 27 - EDGE)
  })
  it('centres the card when there is no target', () => {
    expect(placeCard(null, CARD, VIEW)).toEqual({ x: 156, y: 300, side: 'center' })
  })
})

describe('arrowFor', () => {
  const hole = { x: 100, y: 100, width: 100, height: 40 }
  it('runs from the card top up to just under the spotlight', () => {
    const a = arrowFor(hole, { x: 100, y: 196, width: 288, height: 160 }, 'below')!
    expect(a.start.y).toBe(196)
    expect(a.end).toEqual({ x: 150, y: 140 + TIP_GAP })
    expect(a.d.startsWith(`M ${a.start.x} ${a.start.y} C`)).toBe(true)
  })
  it('runs from the card bottom down to just above the spotlight', () => {
    const a = arrowFor({ x: 400, y: 700, width: 30, height: 30 }, { x: 296, y: 484, width: 288, height: 160 }, 'above')!
    expect(a.start.y).toBe(644)
    expect(a.end.y).toBe(700 - TIP_GAP)
  })
  it('runs sideways for a card beside the spotlight', () => {
    const a = arrowFor({ x: 20, y: 150, width: 200, height: 500 }, { x: 276, y: 182, width: 288, height: 160 }, 'right')!
    expect(a.start.x).toBe(276)
    expect(a.end.x).toBe(220 + TIP_GAP)
  })
  it('has no arrow for a centred card', () => {
    expect(arrowFor(hole, { x: 0, y: 0, width: 10, height: 10 }, 'center')).toBeNull()
  })
})
