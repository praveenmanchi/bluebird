// What surrounds a value: the mode its layer renders in, the words around it and the
// variables nearby layers already use. Reads only; the matcher turns it into a ranking.
import { traverse } from '@shared/figma/traverse'
import type { MatchContext, Neighbourhood } from '../messages'
import { prefixOf, wordsOf } from '../rank'

/** Parents counted as neighbours of a binding, the layer itself included. */
const ANCESTORS = 6
/** Words kept from the layer and its parents; the far end of a deep tree says little. */
const MAX_WORDS = 14
/** Bounds the walk around a selection on a very large page. Ranking gets less to work with, nothing breaks. */
const MAX_LAYERS = 9000

type Bag = Record<string, unknown>
interface Binding { ancestors: readonly string[]; role: string; id: string }
interface Counts { total: number; first: Map<string, number>; firstTwo: Map<string, number>; uses: Map<string, number> }

const FIELD_ROLES: readonly (readonly [string, string])[] = [
  ['itemSpacing', 'gap'], ['paddingLeft', 'padding'], ['paddingTop', 'padding'], ['topLeftRadius', 'CORNER_RADIUS'],
  ['strokeWeight', 'STROKE_FLOAT'], ['strokeTopWeight', 'STROKE_FLOAT'], ['fontSize', 'FONT_SIZE'], ['fontWeight', 'FONT_WEIGHT'], ['lineHeight', 'LINE_HEIGHT'],
]

function ancestorsOf(node: SceneNode): string[] {
  const ids: string[] = []
  for (let n: BaseNode | null = node; n && n.type !== 'PAGE' && ids.length < ANCESTORS; n = n.parent) ids.push(n.id)
  return ids
}

/** The frame on the page (or in a section) a layer belongs to: the widest useful neighbourhood. */
function screenOf(node: SceneNode): SceneNode {
  let top = node
  for (let p = node.parent; p && p.type !== 'PAGE' && p.type !== 'SECTION'; p = p.parent) top = p as SceneNode
  return top
}

function bindingsOf(node: SceneNode): Binding[] {
  const n = node as unknown as Bag
  const bound = (n.boundVariables ?? {}) as Bag
  const ancestors = ancestorsOf(node)
  const out: Binding[] = []
  const paints = (field: string, role: string) => {
    const list = n[field]
    if (!Array.isArray(list)) return
    for (const p of list as SolidPaint[]) {
      const id = p.boundVariables?.color?.id
      if (id && p.visible !== false) out.push({ ancestors, role, id })
    }
  }
  paints('fills', node.type === 'TEXT' ? 'TEXT_FILL' : 'FRAME_FILL')
  paints('strokes', 'STROKE_COLOR')
  for (const [field, role] of FIELD_ROLES) {
    const id = ([bound[field]].flat()[0] as { id?: string } | undefined)?.id
    if (id) out.push({ ancestors, role, id })
  }
  return out
}

const bump = (map: Map<string, number>, key: string) => map.set(key, (map.get(key) ?? 0) + 1)

async function readNeighbourhoods(selection: readonly SceneNode[]): Promise<ReadonlyMap<string, Neighbourhood>> {
  const bindings: Binding[] = []
  await traverse([...new Set(selection.map(screenOf))], (node) => { if (node.visible) bindings.push(...bindingsOf(node)) }, {
    skipChildren: (node) => node.type === 'INSTANCE' || !node.visible,
    onProgress: (visited) => visited < MAX_LAYERS,
  })
  const ids = [...new Set(bindings.map((b) => b.id))]
  const found = await Promise.all(ids.map((id) => figma.variables.getVariableByIdAsync(id)))
  const byId = new Map(ids.flatMap((id, i) => { const v = found[i]; return v ? [[id, v] as const] : [] }))
  const counts = new Map<string, Counts>()
  for (const { ancestors, role, id } of bindings) {
    const v = byId.get(id)
    if (!v) continue
    for (const a of ancestors) {
      const c = counts.get(a) ?? { total: 0, first: new Map(), firstTwo: new Map(), uses: new Map() }
      counts.set(a, c)
      c.total += 1
      bump(c.first, prefixOf(v.name, 1))
      bump(c.firstTwo, prefixOf(v.name, 2))
      bump(c.uses, `${v.key}|${role}`)
    }
  }
  return counts
}

function wordsAround(node: SceneNode): readonly string[] {
  const names: string[] = []
  for (let n: BaseNode | null = node; n && n.type !== 'PAGE'; n = n.parent) names.unshift(n.name)
  return names.flatMap(wordsOf).slice(-MAX_WORDS)
}

/** Reads the surroundings once; the returned function then answers per layer. */
export async function createContexts(selection: readonly SceneNode[]): Promise<(node: SceneNode) => Promise<MatchContext>> {
  const neighbourhoods = await readNeighbourhoods(selection)
  const collections = new Map<string, VariableCollection | null>()

  async function collection(id: string): Promise<VariableCollection | null> {
    if (!collections.has(id)) collections.set(id, await figma.variables.getVariableCollectionByIdAsync(id))
    return collections.get(id) ?? null
  }

  async function modesOf(node: SceneNode): Promise<MatchContext['modes']> {
    const modes: Record<string, string> = {}
    const resolved = (node as unknown as { resolvedVariableModes?: Record<string, string> }).resolvedVariableModes ?? {}
    for (const [id, modeId] of Object.entries(resolved)) {
      const c = await collection(id)
      const mode = c?.modes.find((m) => m.modeId === modeId)
      if (c && mode) modes[c.name] = mode.name
    }
    return modes
  }

  return async (node) => ({
    modes: await modesOf(node),
    words: wordsAround(node),
    neighbours: ancestorsOf(node).flatMap((id) => { const n = neighbourhoods.get(id); return n ? [n] : [] }),
  })
}
