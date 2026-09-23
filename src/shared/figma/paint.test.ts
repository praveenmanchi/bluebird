import { describe, it, expect, beforeEach } from 'vitest'
import { installFigmaMock } from '../../../tests/mocks/figma'
import { resolveBackground, solidFill } from './paint'
import { rgbaToHex } from './color'

type Node = Record<string, unknown>

const solid = (r: number, g: number, b: number, opacity = 1) =>
  ({ type: 'SOLID', visible: true, opacity, color: { r, g, b } })

function frame(id: string, fills: unknown[], extra: Node = {}): Node {
  return { id, name: id, type: 'FRAME', visible: true, opacity: 1, fills, children: [], parent: null, ...extra }
}

/** Parent/child wiring plus absolute bounds, so overlap tests are meaningful. */
function place(node: Node, x: number, y: number, width: number, height: number): Node {
  node.absoluteBoundingBox = { x, y, width, height }
  return node
}

function adopt(parent: Node, children: Node[]): Node {
  parent.children = children
  for (const c of children) c.parent = parent
  return parent
}

beforeEach(() => { installFigmaMock() })

describe('solidFill', () => {
  it('reads the topmost visible solid paint', () => {
    const node = frame('n', [solid(0, 0, 0), solid(1, 0, 0)])
    expect(rgbaToHex(solidFill(node as never)!)).toBe('#ff0000')
  })
  it('returns null when an image is painted over the solid', () => {
    const node = frame('n', [solid(1, 0, 0), { type: 'IMAGE', visible: true }])
    expect(solidFill(node as never)).toBeNull()
  })
  it('folds node opacity into the paint alpha', () => {
    const node = frame('n', [solid(0, 0, 0, 0.5)], { opacity: 0.5 })
    expect(solidFill(node as never)!.a).toBeCloseTo(0.25)
  })
})

describe('resolveBackground', () => {
  it('falls back to white when nothing is painted behind the node', () => {
    const page = { type: 'PAGE', children: [] as Node[] }
    const text = frame('t', [])
    text.parent = page
    const result = resolveBackground(text as never)
    expect(result.color).toEqual({ r: 1, g: 1, b: 1 })
    expect(result.indeterminate).toBe(false)
    // …and says so, rather than presenting the ratio as measured.
    expect(result.assumed).toBe(true)
  })

  it('composites the parent chain', () => {
    const page = { type: 'PAGE' }
    const outer = adopt(frame('outer', [solid(0, 0, 0)], { parent: page }), [])
    const inner = frame('inner', [])
    adopt(outer, [inner])
    const text = frame('t', [])
    adopt(inner, [text])
    expect(rgbaToHex(resolveBackground(text as never).color)).toBe('#000000')
  })

  it('resolves against an overlapping PRECEDING sibling, not the page', () => {
    // The commonest Figma card: a rectangle, then text drawn on top of it.
    const page = { type: 'PAGE' }
    const parent = frame('parent', [], { parent: page })
    const card = place(frame('card', [solid(0, 0, 0)]), 0, 0, 100, 100)
    const text = place(frame('text', []), 10, 10, 50, 20)
    adopt(parent, [card, text])
    expect(rgbaToHex(resolveBackground(text as never).color)).toBe('#000000')
  })

  it('ignores a sibling that does not overlap the node', () => {
    const page = { type: 'PAGE' }
    const parent = frame('parent', [], { parent: page })
    const elsewhere = place(frame('elsewhere', [solid(0, 0, 0)]), 500, 500, 100, 100)
    const text = place(frame('text', []), 10, 10, 50, 20)
    adopt(parent, [elsewhere, text])
    expect(rgbaToHex(resolveBackground(text as never).color)).toBe('#ffffff')
  })

  it('ignores a sibling drawn AFTER the node — it paints on top, not behind', () => {
    const page = { type: 'PAGE' }
    const parent = frame('parent', [], { parent: page })
    const text = place(frame('text', []), 10, 10, 50, 20)
    const over = place(frame('over', [solid(0, 0, 0)]), 0, 0, 100, 100)
    adopt(parent, [text, over])
    expect(rgbaToHex(resolveBackground(text as never).color)).toBe('#ffffff')
  })

  it('skips hidden siblings', () => {
    const page = { type: 'PAGE' }
    const parent = frame('parent', [], { parent: page })
    const card = place(frame('card', [solid(0, 0, 0)]), 0, 0, 100, 100)
    card.visible = false
    const text = place(frame('text', []), 10, 10, 50, 20)
    adopt(parent, [card, text])
    expect(rgbaToHex(resolveBackground(text as never).color)).toBe('#ffffff')
  })

  it('reports an image backdrop as unmeasurable instead of inventing a ratio', () => {
    const page = { type: 'PAGE' }
    const hero = adopt(frame('hero', [{ type: 'IMAGE', visible: true }], { parent: page }), [])
    const text = frame('t', [])
    adopt(hero, [text])
    const result = resolveBackground(text as never)
    expect(result.indeterminate).toBe(true)
    expect(result.reason).toBe('sits on an image fill')
  })

  it('reports a gradient backdrop as unmeasurable', () => {
    const page = { type: 'PAGE' }
    const hero = adopt(frame('hero', [{ type: 'GRADIENT_LINEAR', visible: true }], { parent: page }), [])
    const text = frame('t', [])
    adopt(hero, [text])
    expect(resolveBackground(text as never).reason).toBe('sits on a gradient fill')
  })

  it('composites a translucent layer over the one behind it', () => {
    const page = { type: 'PAGE' }
    const outer = adopt(frame('outer', [solid(1, 1, 1)], { parent: page }), [])
    const scrim = frame('scrim', [solid(0, 0, 0, 0.5)])
    adopt(outer, [scrim])
    const text = frame('t', [])
    adopt(scrim, [text])
    const bg = resolveBackground(text as never).color
    expect(bg.r).toBeCloseTo(0.5)
  })
})

describe('resolveBackground — what counts as a backdrop', () => {
  it('ignores a neighbouring TEXT sibling: glyphs do not fill their box', () => {
    const page = { type: 'PAGE' }
    const parent = frame('parent', [], { parent: page })
    const heading = place(frame('heading', [solid(0, 0, 0)]), 0, 0, 100, 100)
    heading.type = 'TEXT'
    const text = place(frame('text', []), 10, 10, 50, 20)
    adopt(parent, [heading, text])
    expect(rgbaToHex(resolveBackground(text as never).color)).toBe('#ffffff')
  })

  it('ignores a vector sibling, whose bounds are not its shape', () => {
    const page = { type: 'PAGE' }
    const parent = frame('parent', [], { parent: page })
    const blob = place(frame('blob', [solid(0, 0, 0)]), 0, 0, 100, 100)
    blob.type = 'VECTOR'
    const text = place(frame('text', []), 10, 10, 50, 20)
    adopt(parent, [blob, text])
    expect(rgbaToHex(resolveBackground(text as never).color)).toBe('#ffffff')
  })

  it('still honours a RECTANGLE sibling', () => {
    const page = { type: 'PAGE' }
    const parent = frame('parent', [], { parent: page })
    const rect = place(frame('rect', [solid(0, 0, 0)]), 0, 0, 100, 100)
    rect.type = 'RECTANGLE'
    const text = place(frame('text', []), 10, 10, 50, 20)
    adopt(parent, [rect, text])
    expect(rgbaToHex(resolveBackground(text as never).color)).toBe('#000000')
  })
})


describe('resolveBackground — accuracy hardening', () => {
  it('ignores a sibling that merely grazes the node: a backdrop has to sit under it', () => {
    const page = { type: 'PAGE' }
    const parent = frame('parent', [], { parent: page })
    // Covers only the top-left 10×10 of a 50×20 label.
    const corner = place(frame('corner', [solid(0, 0, 0)]), 0, 0, 20, 20)
    const text = place(frame('text', []), 10, 10, 50, 20)
    adopt(parent, [corner, text])
    const result = resolveBackground(text as never)
    expect(rgbaToHex(result.color)).toBe('#ffffff')
    expect(result.assumed).toBe(true)
  })

  it('opens up a GROUP sibling to find the rectangle that actually paints', () => {
    const page = { type: 'PAGE' }
    const parent = frame('parent', [], { parent: page })
    const rect = place(frame('rect', [solid(0, 0, 0)]), 0, 0, 100, 100)
    rect.type = 'RECTANGLE'
    const group = { id: 'g', name: 'Group', type: 'GROUP', visible: true, children: [rect], parent: null as unknown }
    rect.parent = group
    const text = place(frame('text', []), 10, 10, 50, 20)
    adopt(parent, [group as unknown as Node, text])
    const result = resolveBackground(text as never)
    expect(rgbaToHex(result.color)).toBe('#000000')
    expect(result.assumed).toBe(false)
  })

  it('reports how much the ancestors dim the node', () => {
    const page = { type: 'PAGE' }
    const outer = adopt(frame('outer', [solid(1, 1, 1)], { parent: page }), [])
    const faded = frame('faded', [], { opacity: 0.4 })
    adopt(outer, [faded])
    const text = frame('t', [])
    adopt(faded, [text])
    expect(resolveBackground(text as never).foregroundOpacity).toBeCloseTo(0.4)
  })

  it('does not count the opaque backdrop itself as dimming', () => {
    const page = { type: 'PAGE' }
    const outer = adopt(frame('outer', [solid(1, 1, 1)], { parent: page, opacity: 0.5 }), [])
    const text = frame('t', [])
    adopt(outer, [text])
    // A 50% white frame is not opaque, so the walk continues past it and the
    // dimming applies; the white fallback is then assumed.
    const result = resolveBackground(text as never)
    expect(result.foregroundOpacity).toBeCloseTo(0.5)
    expect(result.assumed).toBe(true)
  })
})
