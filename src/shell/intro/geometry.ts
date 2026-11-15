// Placement maths for the coach marks, kept free of the DOM so it can be unit-tested.
// Mirrors the Figma builder: the card sits below the spotlight when it fits, else above, else
// beside it; an S-curve arrow runs from a dot on the card edge to just short of the spotlight.

export interface Rect { x: number; y: number; width: number; height: number }
export interface Size { width: number; height: number }
export interface Point { x: number; y: number }
export type Side = 'below' | 'above' | 'right' | 'left' | 'center'

export interface Placement { x: number; y: number; side: Side }
export interface Arrow { start: Point; end: Point; d: string }

/** Space between the spotlight and the card, which the arrow crosses. */
export const ARROW_GAP = 56
/** How far the arrow tip stops short of the spotlight ring. */
export const TIP_GAP = 8
/** Minimum distance between the card and the plugin edge. */
export const EDGE = 16
/** How far the arrow's start dot is offset from the spotlight centre, so the curve reads as a curve. */
const CURVE_OFFSET = 36

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, hi < lo ? lo : v))

export function unionRect(rects: readonly Rect[]): Rect | null {
  const real = rects.filter((r) => r.width > 0 && r.height > 0)
  if (!real.length) return null
  const x = Math.min(...real.map((r) => r.x))
  const y = Math.min(...real.map((r) => r.y))
  const right = Math.max(...real.map((r) => r.x + r.width))
  const bottom = Math.max(...real.map((r) => r.y + r.height))
  return { x, y, width: right - x, height: bottom - y }
}

/** The spotlight hole: the target grown by `pad`, kept inside the view. */
export function holeRect(target: Rect, pad: number, view: Size): Rect {
  const x = Math.max(0, target.x - pad)
  const y = Math.max(0, target.y - pad)
  const right = Math.min(view.width, target.x + target.width + pad)
  const bottom = Math.min(view.height, target.y + target.height + pad)
  return { x, y, width: Math.max(0, right - x), height: Math.max(0, bottom - y) }
}

/** Where the card goes for a spotlight `hole` in a `view`; `reserve` keeps the bottom (the footer) clear when it can. */
export function placeCard(hole: Rect | null, card: Size, view: Size, reserve = 0): Placement {
  const centred: Placement = { x: Math.max(EDGE, (view.width - card.width) / 2), y: Math.max(EDGE, (view.height - card.height) / 2), side: 'center' }
  if (!hole) return centred
  const cx = hole.x + hole.width / 2
  const x = clamp(cx - card.width / 2, EDGE, view.width - EDGE - card.width)
  const belowY = hole.y + hole.height + ARROW_GAP
  if (belowY + card.height <= view.height - reserve - EDGE) return { x, y: belowY, side: 'below' }
  const aboveY = hole.y - ARROW_GAP - card.height
  if (aboveY >= EDGE) return { x, y: aboveY, side: 'above' }
  const sideY = clamp(hole.y + 32, EDGE, view.height - EDGE - card.height)
  if (hole.x + hole.width + ARROW_GAP + card.width <= view.width - EDGE) return { x: hole.x + hole.width + ARROW_GAP, y: sideY, side: 'right' }
  if (hole.x - ARROW_GAP - card.width >= EDGE) return { x: hole.x - ARROW_GAP - card.width, y: sideY, side: 'left' }
  // Nothing fits around a target this big: the card covers its lower part, still clear of the footer.
  return { x: centred.x, y: clamp(view.height - reserve - EDGE - card.height, EDGE, view.height - EDGE - card.height), side: 'center' }
}

/** The S-curve from a dot on the card edge to just outside the spotlight; null when the card is centred. */
export function arrowFor(hole: Rect, card: Rect, side: Side): Arrow | null {
  const cx = hole.x + hole.width / 2
  if (side === 'below' || side === 'above') {
    const off = card.x + card.width / 2 >= cx ? CURVE_OFFSET : -CURVE_OFFSET
    const sx = clamp(cx + off, card.x + 32, card.x + card.width - 32)
    const ex = clamp(cx, hole.x + 6, hole.x + hole.width - 6)
    const sy = side === 'below' ? card.y : card.y + card.height
    const ey = side === 'below' ? hole.y + hole.height + TIP_GAP : hole.y - TIP_GAP
    const k = (ey - sy) * 0.55
    return { start: { x: sx, y: sy }, end: { x: ex, y: ey }, d: `M ${sx} ${sy} C ${sx} ${sy + k} ${ex} ${ey - k} ${ex} ${ey}` }
  }
  if (side === 'right' || side === 'left') {
    const sx = side === 'right' ? card.x : card.x + card.width
    const sy = card.y + 48
    const ex = side === 'right' ? hole.x + hole.width + TIP_GAP : hole.x - TIP_GAP
    const ey = clamp(card.y + 16, hole.y + 12, hole.y + hole.height - 12)
    const k = (ex - sx) * 0.55
    return { start: { x: sx, y: sy }, end: { x: ex, y: ey }, d: `M ${sx} ${sy} C ${sx + k} ${sy} ${ex - k} ${ey} ${ex} ${ey}` }
  }
  return null
}
