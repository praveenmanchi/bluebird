// Component inventory for the Scan Summary: which components the scan met, their
// atomic-design level, and whether each passed. Works on a minimal node shape so it
// runs against the Figma API in the sandbox and plain objects in tests.
import type { ComponentLevel, ScanInventory, ScannedComponent } from './messages'

export interface InventoryNode {
  readonly id: string
  readonly type: string
  readonly name: string
  readonly parent: InventoryNode | null | { readonly type: string }
  readonly children?: readonly InventoryNode[]
}

/** How many component levels sit inside `node`: 0 for an instance with no nested instance. */
export function nestingDepth(node: InventoryNode): number {
  let deepest = 0
  for (const child of node.children ?? []) {
    const below = nestingDepth(child)
    deepest = Math.max(deepest, child.type === 'INSTANCE' ? below + 1 : below)
  }
  return deepest
}

const levelFor = (depth: number): ComponentLevel => (depth === 0 ? 'atom' : depth === 1 ? 'molecule' : 'organism')

const isNode = (p: InventoryNode['parent']): p is InventoryNode => p !== null && 'id' in p

export interface InventoryInput {
  roots: readonly InventoryNode[]
  /** Every instance the walk met. Several may share one component. */
  instances: readonly InventoryNode[]
  /** The layers a finding points at. */
  findingNodes: readonly InventoryNode[]
  /** The component an instance belongs to — set level for variants — or undefined when detached. */
  identityOf: (instance: InventoryNode) => { key: string; name: string } | undefined
}

export function buildInventory({ roots, instances, findingNodes, identityOf }: InventoryInput): ScanInventory {
  const byKey = new Map<string, ScannedComponent>()
  const depthByKey = new Map<string, number>()
  for (const inst of instances) {
    const id = identityOf(inst)
    if (!id) continue
    // The deepest instance wins: an override can add nesting to one instance only.
    const depth = Math.max(depthByKey.get(id.key) ?? 0, nestingDepth(inst))
    depthByKey.set(id.key, depth)
    const existing = byKey.get(id.key)
    byKey.set(id.key, { key: id.key, name: id.name, level: levelFor(depth), instances: (existing?.instances ?? 0) + 1, failing: existing?.failing ?? false })
  }

  const rootIds = new Set(roots.map((r) => r.id))
  const failingFrames = new Set<string>()
  for (const found of findingNodes) {
    let blamed = false
    for (let n: InventoryNode | null = found; n; n = isNode(n.parent) ? n.parent : null) {
      if (!blamed && n.type === 'INSTANCE') {
        const id = identityOf(n)
        const c = id && byKey.get(id.key)
        if (c) { byKey.set(c.key, { ...c, failing: true }); blamed = true }
      }
      if (rootIds.has(n.id)) failingFrames.add(n.id)
    }
  }

  return {
    components: [...byKey.values()],
    frames: roots.filter((r) => r.type === 'FRAME').map((r) => ({ nodeId: r.id, name: r.name, failing: failingFrames.has(r.id) })),
  }
}
