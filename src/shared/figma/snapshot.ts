// Runs inside Figma: reads the file's local variables and components into a
// Snapshot the diff can compare. Read-only — nothing in the document changes.
import { rgbaToHex, type RGBA } from '@shared/figma/color'
import { traverse } from '@shared/figma/traverse'
import type { ComponentEntry, Snapshot, VariableEntry, VariableValueType } from '@shared/design/types'

/** Easing and timing variables (prototype motion) are reported as text. */
const TYPE: Partial<Record<VariableResolvedDataType, VariableValueType>> = { COLOR: 'color', FLOAT: 'number', STRING: 'string', BOOLEAN: 'boolean' }

/** One mode's value as the change list shows it. Aliases name their target instead of resolving it. */
export function formatValue(value: VariableValue | undefined, names: ReadonlyMap<string, string>): string {
  if (value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return String(Math.round(value * 1000) / 1000)
  if (typeof value === 'string') return value
  if ('type' in value && value.type === 'VARIABLE_ALIAS') return `→ ${names.get(value.id) ?? 'library variable'}`
  if ('r' in value) return rgbaToHex(value as RGBA).toUpperCase()
  return '—'
}

async function readVariables(): Promise<VariableEntry[]> {
  const [collections, variables] = await Promise.all([
    figma.variables.getLocalVariableCollectionsAsync(),
    figma.variables.getLocalVariablesAsync(),
  ])
  const collectionById = new Map(collections.map((c) => [c.id, c]))
  const names = new Map(variables.map((v) => [v.id, v.name]))
  return variables.flatMap((v) => {
    const collection = collectionById.get(v.variableCollectionId)
    if (!collection || v.remote) return []
    const values = Object.fromEntries(collection.modes.map((m) => [m.name, formatValue(v.valuesByMode[m.modeId], names)]))
    return [{ id: v.id, name: v.name, collection: collection.name, type: TYPE[v.resolvedType] ?? 'string', values, description: v.description }]
  })
}

/** Variable ids bound anywhere inside `root` (node properties and individual paints). */
async function boundVariableIds(root: ComponentSetNode | ComponentNode): Promise<string[]> {
  const ids = new Set<string>()
  const add = (alias: unknown) => {
    if (Array.isArray(alias)) alias.forEach(add)
    else if (alias && typeof alias === 'object' && 'id' in alias && typeof alias.id === 'string') ids.add(alias.id)
  }
  await traverse([root], (node) => {
    const bound = (node as SceneNode & { boundVariables?: Record<string, unknown> }).boundVariables
    if (bound) Object.values(bound).forEach(add)
  })
  return [...ids].sort()
}

function pageOf(node: BaseNode): string {
  let n: BaseNode | null = node
  while (n && n.type !== 'PAGE') n = n.parent
  return n?.name ?? ''
}

function propertyNames(node: ComponentSetNode | ComponentNode): string[] {
  try {
    // Property keys carry a "#id" suffix for non-variant props; the name is what designers see.
    return Object.keys(node.componentPropertyDefinitions).map((k) => k.replace(/#[^#]*$/, '')).sort()
  } catch {
    return [] // a set with conflicting variant names throws here; report it with no properties
  }
}

const isDefinition = (n: SceneNode): n is ComponentSetNode | ComponentNode => n.type === 'COMPONENT_SET' || n.type === 'COMPONENT'

/** Component sets and standalone components on every page. Pages load one at a time (dynamic-page access). */
async function readComponents(): Promise<ComponentEntry[]> {
  const roots: Array<ComponentSetNode | ComponentNode> = []
  for (const page of figma.root.children) {
    await page.loadAsync()
    await traverse(page.children, (n) => { if (isDefinition(n)) roots.push(n) }, {
      // Nothing defines components inside a set's variants or inside an instance.
      skipChildren: (n) => isDefinition(n) || n.type === 'INSTANCE',
    })
  }
  const out: ComponentEntry[] = []
  for (const n of roots) {
    out.push({
      id: n.key || n.id,
      nodeId: n.id,
      name: n.name,
      page: pageOf(n),
      variants: n.type === 'COMPONENT_SET' ? n.children.length : 1,
      properties: propertyNames(n),
      description: n.description,
      usesVariables: await boundVariableIds(n),
    })
  }
  return out
}

export async function readSnapshot(): Promise<Snapshot> {
  const [variables, components] = await Promise.all([readVariables(), readComponents()])
  return { takenAt: new Date().toISOString(), variables, components }
}
