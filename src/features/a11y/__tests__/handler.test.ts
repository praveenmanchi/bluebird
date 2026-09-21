import { describe, it, expect, beforeEach, vi } from 'vitest'
import { installFigmaMock } from '../../../../tests/mocks/figma'
import { handlers } from '../sandbox/handler'
import { MSG, type ScanResult } from '../messages'

function text(id: string, chars: string, color: { r: number; g: number; b: number }, fontSize = 14, parent: unknown = null) {
  return { id, type: 'TEXT', name: id, visible: true, characters: chars, fontSize, fontName: { family: 'Inter', style: 'Regular' }, fontWeight: 400,
    opacity: 1, fills: [{ type: 'SOLID', visible: true, opacity: 1, color }], parent }
}

describe('a11y:scan', () => {
  beforeEach(() => {
    const frame: Record<string, unknown> = { id: 'f', type: 'FRAME', name: 'Card', visible: true, opacity: 1, fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }], parent: { type: 'PAGE' } }
    frame.children = [
      text('t-bad', 'faint', { r: 0.8, g: 0.8, b: 0.8 }, 12, frame),
      text('t-ok', 'strong', { r: 0, g: 0, b: 0 }, 12, frame),
    ]
    installFigmaMock({ currentPage: { selection: [frame], children: [frame] } as unknown as PageNode })
  })

  it('reports only text below AAA, worst first, and emits progress', async () => {
    const emit = vi.fn()
    const result = await (handlers[MSG.scan] as unknown as (p: unknown, c: { emit: typeof emit }) => Promise<ScanResult>)({ scope: 'selection' }, { emit })
    expect(result.scanned).toBe(3)
    expect(result.textNodes).toBe(2)
    expect(result.issues.map((i) => i.nodeId)).toEqual(['t-bad'])
    expect(result.issues[0]?.level).toBe('fail')
    expect(emit).toHaveBeenCalledWith(MSG.progress, { visited: 3 })
  })

  it('rejects an invalid scope', async () => {
    await expect((handlers[MSG.scan] as unknown as (p: unknown, c: unknown) => Promise<unknown>)({ scope: 'galaxy' }, { emit: vi.fn() })).rejects.toThrow()
  })
})

describe('a11y:focus', () => {
  it('selects and zooms to the node', async () => {
    const node = { id: '9', type: 'TEXT' }
    const figma = installFigmaMock({ getNodeByIdAsync: vi.fn(async () => node) as unknown as PluginAPI['getNodeByIdAsync'] })
    await (handlers[MSG.focus] as unknown as (p: unknown, c: unknown) => Promise<void>)({ nodeId: '9' }, { emit: vi.fn() })
    expect(figma.currentPage.selection).toEqual([node])
    expect(figma.viewport.scrollAndZoomIntoView).toHaveBeenCalledWith([node])
  })

  it('throws when the node is gone', async () => {
    installFigmaMock()
    await expect((handlers[MSG.focus] as unknown as (p: unknown, c: unknown) => Promise<void>)({ nodeId: 'x' }, { emit: vi.fn() })).rejects.toThrow(/no longer exists/)
  })
})
