// Runs inside Figma: reveal a node, read what the selection binds (variables and
// component instances, with the keys that tie them to their library), and open a
// library link. Read-only apart from the selection and viewport.
import type { HandlerMap } from '@shared/bridge'
import { INTEGRATIONS_KEY, mergeIntegrations } from '@shared/integrations'
import { createAskHandlers } from './ask'
import { MSG, SELECTION_NODE_LIMIT, focusRequestSchema, openRequestSchema, type InstanceRef, type SelectionContext } from '../messages'

async function focus(payload: unknown): Promise<void> {
  const { nodeId } = focusRequestSchema.parse(payload)
  const node = await figma.getNodeByIdAsync(nodeId)
  if (!node || node.type === 'DOCUMENT' || node.type === 'PAGE') throw new Error('Layer no longer exists')
  figma.currentPage.selection = [node as SceneNode]
  figma.viewport.scrollAndZoomIntoView([node as SceneNode])
}

/** Variable ids in a boundVariables entry: one alias, a list (fills, strokes) or a map (component properties). */
function aliasIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(aliasIds)
  if (typeof value !== 'object' || value === null) return []
  if ((value as { type?: string }).type === 'VARIABLE_ALIAS') return [(value as VariableAlias).id]
  return Object.values(value).flatMap(aliasIds)
}

function instanceRef(main: ComponentNode): Omit<InstanceRef, 'count'> {
  const set = main.parent?.type === 'COMPONENT_SET' ? main.parent : null
  return { name: set?.name ?? main.name, key: main.key, remote: main.remote }
}

async function selection(): Promise<SelectionContext | null> {
  const root = figma.currentPage.selection[0]
  if (!root) return null
  const bound = new Map<string, { properties: Set<string>; layers: number }>()
  const mains = new Map<string, { main: ComponentNode; count: number }>()
  const stack: SceneNode[] = [root]
  let nodes = 0
  while (stack.length && nodes < SELECTION_NODE_LIMIT) {
    const node = stack.pop()!
    nodes++
    const seen = new Set<string>()
    for (const [field, value] of Object.entries(('boundVariables' in node ? node.boundVariables : undefined) ?? {})) {
      for (const id of aliasIds(value)) {
        const entry = bound.get(id) ?? { properties: new Set<string>(), layers: 0 }
        entry.properties.add(field)
        if (!seen.has(id)) { entry.layers++; seen.add(id) }
        bound.set(id, entry)
      }
    }
    if (node.type === 'INSTANCE') {
      const main = await node.getMainComponentAsync()
      if (main) mains.set(main.id, { main, count: (mains.get(main.id)?.count ?? 0) + 1 })
    }
    // A nested instance's layers are its library component's internals, not the designer's choices (its own
    // overrides were read above). The selected layer itself is always opened: that's what was asked about.
    if ((node === root || node.type !== 'INSTANCE') && 'children' in node) stack.push(...node.children)
  }

  const variables = (await Promise.all([...bound].map(async ([id, use]) => {
    const variable = await figma.variables.getVariableByIdAsync(id)
    return variable ? { name: variable.name, key: variable.key, remote: variable.remote, properties: [...use.properties], layers: use.layers } : null
  }))).filter((v) => v !== null)

  // Variants of one set read as one component, their counts summed.
  const components = new Map<string, InstanceRef>()
  for (const { main, count } of mains.values()) {
    const ref = instanceRef(main)
    const id = `${ref.name}\u0000${ref.remote}`
    const prev = components.get(id)
    components.set(id, prev ? { ...prev, count: prev.count + count } : { ...ref, count })
  }

  return {
    name: root.name, type: root.type, nodes, truncated: stack.length > 0, selected: figma.currentPage.selection.length,
    variables: variables.sort((a, b) => b.layers - a.layers || a.name.localeCompare(b.name)),
    components: [...components.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
  }
}

export const handlers: HandlerMap = {
  // Claude (uxai:ask) and Settings' AI Test Connection; the key is read here and never sent to the UI.
  ...createAskHandlers({
    readSettings: async () => mergeIntegrations(await figma.clientStorage.getAsync(INTEGRATIONS_KEY)).ai,
    fetch: (url, init) => fetch(url, init),
  }),
  [MSG.focus]: focus,
  [MSG.selection]: selection,
  [MSG.open]: (payload: unknown) => { figma.openExternal(openRequestSchema.parse(payload).url) },
}
