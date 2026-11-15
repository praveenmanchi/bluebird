// Runs inside Figma: reads the selection for the Select step and walks it for
// the readiness checks. Read-only — nothing in the document changes.
import { rgbaToHex, type RGBA } from '@shared/figma/color'
import { traverse } from '@shared/figma/traverse'
import type { SelectionInfo, SelectionResult, VariantAxis } from '../messages'
import { DEFAULT_NAME, type HandoffInventory } from './checks'

/** A walk stops here: the handoff is about one component or screen, not a page. */
export const INSPECT_NODE_LIMIT = 5_000

const hasChildren = (n: BaseNode): n is BaseNode & ChildrenMixin => 'children' in n

/** "Page › Section › Frame", without the node itself. */
export function pathOf(node: BaseNode): string {
  const names: string[] = []
  let cur: BaseNode | null = node.parent
  while (cur && cur.type !== 'DOCUMENT') { names.unshift(cur.name); cur = cur.parent }
  return names.join(' › ')
}

/** Variants of the set a layer belongs to: the set itself, a variant inside one, or an instance of one. */
async function variantsOf(node: SceneNode): Promise<number> {
  if (node.type === 'COMPONENT_SET') return node.children.length
  if (node.type === 'COMPONENT') return node.parent?.type === 'COMPONENT_SET' ? node.parent.children.length : 0
  if (node.type === 'INSTANCE') {
    try {
      const main = await node.getMainComponentAsync()
      return main?.parent?.type === 'COMPONENT_SET' ? main.parent.children.length : 0
    } catch { return 0 }
  }
  return 0
}

async function descriptionOf(node: SceneNode): Promise<string> {
  if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') return node.description
  if (node.type === 'INSTANCE') {
    try { return (await node.getMainComponentAsync())?.description ?? '' } catch { return '' }
  }
  return ''
}

/** The node whose property definitions describe this layer: the set, a standalone component, or an instance's main one. A variant never is. */
async function definitionOwner(node: SceneNode): Promise<ComponentNode | ComponentSetNode | null> {
  if (node.type === 'COMPONENT_SET') return node
  if (node.type === 'COMPONENT') return node.parent?.type === 'COMPONENT_SET' ? node.parent : node
  if (node.type !== 'INSTANCE') return null
  try {
    const main = await node.getMainComponentAsync()
    if (!main) return null
    return main.parent?.type === 'COMPONENT_SET' ? main.parent : main
  } catch { return null }
}

/** Variant properties with their values, and the names of the other properties, as the generated component's props. */
export async function propertiesOf(node: SceneNode): Promise<{ variantAxes: VariantAxis[]; properties: string[] }> {
  const owner = await definitionOwner(node)
  let defs: ComponentPropertyDefinitions = {}
  try { defs = owner?.componentPropertyDefinitions ?? {} } catch { defs = {} } // a set with conflicting variants throws
  const entries = Object.entries(defs)
  return {
    variantAxes: entries.filter(([, d]) => d.type === 'VARIANT').map(([name, d]) => ({ name, options: d.variantOptions ?? [] })),
    properties: entries.filter(([, d]) => d.type !== 'VARIANT').map(([name]) => name.split('#')[0]!),
  }
}

export async function describeNode(node: SceneNode): Promise<SelectionInfo> {
  const [variants, description, props] = await Promise.all([variantsOf(node), descriptionOf(node), propertiesOf(node)])
  const layers = await traverse([node], () => undefined, { onProgress: (visited) => visited < INSPECT_NODE_LIMIT })
  const path = pathOf(node)
  return {
    nodeId: node.id, frame: node.name, type: node.type, variants, layers, description,
    path: variants ? `${path} · ${variants} variant${variants === 1 ? '' : 's'}` : path,
    variantAxes: props.variantAxes, properties: props.properties,
  }
}

export async function describeSelection(): Promise<SelectionResult> {
  const selection = figma.currentPage.selection
  const first = selection[0]
  return {
    selected: first ? await describeNode(first) : null,
    count: selection.length,
    fileName: figma.root.name,
    fileKey: figma.fileKey ?? null,
  }
}

const paintBound = (node: SceneNode, field: 'fills' | 'strokes', index: number): boolean => {
  const bound = (node as SceneNode & { boundVariables?: Record<string, unknown> }).boundVariables?.[field]
  return Array.isArray(bound) && !!bound[index]
}

const numberBound = (node: SceneNode, field: string): boolean => {
  const bound = (node as SceneNode & { boundVariables?: Record<string, unknown> }).boundVariables?.[field]
  return !!bound
}

/** Everything the readiness checks look at, from one walk of the selected node. */
export async function collectInventory(root: SceneNode): Promise<HandoffInventory> {
  const instances: Array<{ name: string; remote: boolean }> = []
  const detached: string[] = []
  const absolute: string[] = []
  const rawPaints: string[] = []
  const rawNumbers: number[] = []
  const unstyledTexts: string[] = []
  const defaultNames: string[] = []
  const pendingInstances: InstanceNode[] = []
  let frames = 0, autoLayout = 0, boundPaints = 0, boundNumbers = 0, texts = 0

  const layers = await traverse([root], (node) => {
    if (!node.visible) return
    if (DEFAULT_NAME.test(node.name) && node !== root) defaultNames.push(node.name)
    if (node.type === 'INSTANCE') pendingInstances.push(node)
    if (node.type === 'FRAME' && node.detachedInfo) detached.push(node.name)
    if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'COMPONENT_SET' || node.type === 'INSTANCE') {
      frames += 1
      if (node.layoutMode !== 'NONE') autoLayout += 1
      else if (hasChildren(node) && node.children.length > 1) absolute.push(node.name)
      else frames -= 1 // a leaf frame (an icon slot, say) has nothing to lay out
      if (node.layoutMode !== 'NONE') {
        for (const field of ['itemSpacing', 'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom'] as const) {
          const value = node[field]
          if (typeof value !== 'number' || value === 0) continue
          if (numberBound(node, field)) boundNumbers += 1
          else rawNumbers.push(value)
        }
      }
    }
    if ('cornerRadius' in node && typeof node.cornerRadius === 'number' && node.cornerRadius > 0) {
      if (numberBound(node, 'topLeftRadius') || numberBound(node, 'cornerRadius')) boundNumbers += 1
      else rawNumbers.push(node.cornerRadius)
    }
    for (const field of ['fills', 'strokes'] as const) {
      if (!(field in node)) continue
      const paints = (node as GeometryMixin)[field]
      if (paints === figma.mixed || !Array.isArray(paints)) continue
      paints.forEach((paint, i) => {
        if (paint.visible === false || paint.type !== 'SOLID') return
        if (paintBound(node, field, i)) boundPaints += 1
        else rawPaints.push(rgbaToHex({ ...paint.color, a: paint.opacity ?? 1 } as RGBA).toUpperCase())
      })
    }
    if (node.type === 'TEXT') {
      texts += 1
      const styled = node.textStyleId !== '' || numberBound(node, 'fontSize') || numberBound(node, 'fontFamily')
      if (!styled) unstyledTexts.push(node.name)
    }
  }, {
    // An instance's insides belong to its component: its own file is where they are fixed.
    skipChildren: (node) => node.type === 'INSTANCE' && node !== root,
    onProgress: (visited) => visited < INSPECT_NODE_LIMIT,
  })

  for (const instance of pendingInstances) {
    try {
      const main = await instance.getMainComponentAsync()
      instances.push({ name: main ? (main.parent?.type === 'COMPONENT_SET' ? main.parent.name : main.name) : instance.name, remote: main?.remote ?? false })
    } catch {
      instances.push({ name: instance.name, remote: false }) // a library that isn't loaded
    }
  }

  return {
    nodeId: root.id, name: root.name, type: root.type, description: await descriptionOf(root), layers,
    instanceList: instances, detached, frames, autoLayout, absolute, boundPaints, rawPaints, boundNumbers, rawNumbers, texts, unstyledTexts, defaultNames,
  }
}
