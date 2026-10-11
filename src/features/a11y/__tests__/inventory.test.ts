import { describe, it, expect } from 'vitest'
import { buildInventory, nestingDepth, type InventoryNode } from '../inventory'

/** Tiny tree builder: parents are wired so ancestor walks work. */
function node(id: string, type: string, children: InventoryNode[] = []): InventoryNode {
  const n: InventoryNode = { id, type, name: id, parent: null, children }
  for (const c of children) (c as { parent: InventoryNode | null }).parent = n
  return n
}

// Frame "Login" › Card (organism) › Field (molecule) › Button (atom) › Label (text)
//                               › Icon (atom)
const label = node('label', 'TEXT')
const button = node('button', 'INSTANCE', [label])
const field = node('field', 'INSTANCE', [button])
const icon = node('icon', 'INSTANCE', [node('glyph', 'VECTOR')])
const card = node('card', 'INSTANCE', [field, icon])
const frame = node('login', 'FRAME', [card])
const other = node('signup', 'FRAME', [node('copy', 'TEXT')])

const identity: Record<string, { key: string; name: string }> = {
  button: { key: 'Button', name: 'Button' }, field: { key: 'Field', name: 'Field' },
  icon: { key: 'Icon', name: 'Icon' }, card: { key: 'Card', name: 'Card' },
}
const identityOf = (n: InventoryNode) => identity[n.id]

describe('nestingDepth', () => {
  it('counts how many component levels sit inside an instance', () => {
    expect(nestingDepth(button)).toBe(0)
    expect(nestingDepth(field)).toBe(1)
    expect(nestingDepth(card)).toBe(2)
  })
})

describe('buildInventory', () => {
  it('classifies each distinct component as atom, molecule or organism', () => {
    const inv = buildInventory({ roots: [frame, other], instances: [card, field, button, icon], findingNodes: [], identityOf })
    const level = Object.fromEntries(inv.components.map((c) => [c.name, c.level]))
    expect(level).toEqual({ Card: 'organism', Field: 'molecule', Button: 'atom', Icon: 'atom' })
    expect(inv.frames.map((f) => f.name)).toEqual(['login', 'signup'])
  })

  it('blames the nearest component for a finding, and the frame it sits in', () => {
    const inv = buildInventory({ roots: [frame, other], instances: [card, field, button, icon], findingNodes: [label], identityOf })
    const failing = inv.components.filter((c) => c.failing).map((c) => c.name)
    expect(failing).toEqual(['Button'])
    expect(inv.frames.find((f) => f.name === 'login')?.failing).toBe(true)
    expect(inv.frames.find((f) => f.name === 'signup')?.failing).toBe(false)
  })

  it('merges instances of one component and counts them', () => {
    const b2 = node('button-2', 'INSTANCE', [node('label-2', 'TEXT')])
    identity['button-2'] = { key: 'Button', name: 'Button' }
    const f2 = node('f2', 'FRAME', [b2])
    const inv = buildInventory({ roots: [f2, frame], instances: [b2, card, field, button, icon], findingNodes: [], identityOf })
    expect(inv.components.find((c) => c.key === 'Button')?.instances).toBe(2)
    expect(inv.components).toHaveLength(4)
  })

  it('treats a finding on the instance itself (a tap target) as that component failing', () => {
    const inv = buildInventory({ roots: [frame], instances: [card, field, button, icon], findingNodes: [icon], identityOf })
    expect(inv.components.filter((c) => c.failing).map((c) => c.name)).toEqual(['Icon'])
  })

  it('ignores instances with no resolvable main component', () => {
    const loose = node('loose', 'INSTANCE')
    const inv = buildInventory({ roots: [frame], instances: [loose, button], findingNodes: [], identityOf })
    expect(inv.components.map((c) => c.name)).toEqual(['Button'])
  })
})
