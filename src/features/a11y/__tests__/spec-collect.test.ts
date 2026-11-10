import { describe, it, expect, vi } from 'vitest'
import { installFigmaMock } from '../../../../tests/mocks/figma'
import { collectSpec, specRoot } from '../sandbox/spec-collect'

type Fake = Record<string, unknown> & { children?: Fake[] }

function node(type: string, name: string, x: number, y: number, extra: Partial<Fake> = {}): Fake {
  const n: Fake = { id: `${name}-id`, type, name, visible: true, absoluteBoundingBox: { x, y, width: 40, height: 24 }, x, y, width: 40, height: 24, ...extra }
  const kids = (extra.children ?? []) as Fake[]
  for (const k of kids) k.parent = n
  if (kids.length) {
    n.findAllWithCriteria = ({ types }: { types: string[] }) => {
      const out: Fake[] = []
      const walk = (list: Fake[]) => { for (const c of list) { if (types.includes(c.type as string)) out.push(c); walk((c.children ?? []) as Fake[]) } }
      walk(kids)
      return out
    }
  }
  return n
}

const text = (name: string, chars: string, x: number, y: number, fontSize = 12) => node('TEXT', name, x, y, { characters: chars, fontSize, textStyleId: '' })

function instance(name: string, setName: string, states: string[], x: number, y: number, children: Fake[] = []): Fake {
  const set = { type: 'COMPONENT_SET', name: setName, componentPropertyDefinitions: states.length ? { State: { type: 'VARIANT', variantOptions: states } } : {} }
  const main = { name: 'State=Default', parent: set }
  return node('INSTANCE', name, x, y, { children, getMainComponentAsync: async () => main })
}

describe('collectSpec', () => {
  it('finds controls, headings, landmarks and images relative to the screen', async () => {
    installFigmaMock({ getStyleByIdAsync: vi.fn(async () => null) as unknown as PluginAPI['getStyleByIdAsync'] })
    const settings = instance('settings', 'Icon button', ['Default', 'Hover', 'Focus'], 440, 110)
    const header = node('FRAME', 'Header', 100, 100, { children: [settings] })
    const platform = instance('Platform', 'Dropdown', ['Default', 'Open'], 116, 160, [text('Value', 'Web', 120, 164)])
    const plain = node('FRAME', 'Frame 12', 116, 400, { reactions: [{ trigger: { type: 'ON_CLICK' } }], children: [text('Label', 'Open', 120, 404)] })
    const title = text('Title', 'Scan summary', 116, 220, 20)
    const score = text('Score', '67%', 116, 260, 32)
    // A card named after its content is not a control, and its chips are not buttons.
    const card = instance('WCAG Card · 2.5.8 · Close', 'WCAG Card', [], 116, 500, [instance('Mode Bridge', 'Brand Mode Chip', [], 120, 504)])
    const hero = node('RECTANGLE', 'Hero', 0, 0, { fills: [{ type: 'IMAGE', visible: true }] })
    const root = node('FRAME', 'Results', 100, 100, { width: 480, height: 640, children: [header, platform, title, score, plain, card, hero] })

    const spec = await collectSpec(root as unknown as FrameNode)

    expect(spec.rootName).toBe('Results')
    expect(spec.controls.map((c) => [c.name, c.role, c.text, c.detached])).toEqual([
      ['settings', 'button', '', false],
      ['Platform', 'combobox', 'Web', false],
      ['Frame 12', 'button', 'Open', true],
    ])
    expect(spec.controls[1]).toMatchObject({ component: 'Dropdown', states: ['Default', 'Open'], box: { x: 16, y: 60, width: 40, height: 24 } })
    expect(spec.headings).toEqual([expect.objectContaining({ text: 'Scan summary', level: 1 })])
    expect(spec.landmarks).toEqual([expect.objectContaining({ name: 'Header', role: 'banner' })])
    expect(spec.images).toBe(1)
  })
})

describe('specRoot', () => {
  it('climbs from a selected layer to its top-level frame', () => {
    const pageNode = { type: 'PAGE' }
    const frame: Fake = { type: 'FRAME', name: 'Screen', parent: pageNode }
    const child: Fake = { type: 'TEXT', name: 'x', parent: frame }
    expect(specRoot([child as unknown as SceneNode])).toBe(frame)
    expect(specRoot([])).toBeNull()
  })
})
