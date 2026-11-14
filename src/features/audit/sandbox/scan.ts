// One walk of the scope for both halves of the audit: every instance and detached frame
// by where it came from, and every paint and auto-layout length against the system.
// Library Analytics can't do this: it has no page, selection or layer data.
import { traverse } from '@shared/figma/traverse'
import type { LibraryComponent } from '@shared/libraries/types'
import type { AuditProgress, BoundPlace, Hit, Scope } from '../messages'
import { readNodePaints, readNodeSpacing, type Scales } from './variables'

export const cleanPageName = (name: string) => name.replace(/^[\s↳]+/, '').trim()

interface Root { pageName: string; nodes: readonly SceneNode[]; load: () => Promise<void> }

function rootsOf(scope: Scope): Root[] {
  if (scope.mode === 'selection') {
    return [{ pageName: cleanPageName(figma.currentPage.name), nodes: figma.currentPage.selection, load: async () => undefined }]
  }
  const wanted = scope.mode === 'current' ? new Set([figma.currentPage.id]) : new Set(scope.pageIds)
  return figma.root.children.filter((p) => wanted.has(p.id)).map((p) => ({
    pageName: cleanPageName(p.name),
    get nodes() { return p.children },
    load: () => p.loadAsync(),
  }))
}

/** The top-level frame a layer sits in, so a place is something the designer recognises. */
export function placeOf(node: SceneNode): { id: string; name: string } {
  let top: BaseNode = node
  for (let p: BaseNode | null = node; p && p.type !== 'PAGE'; p = p.parent) {
    if (p.type !== 'SECTION') top = p
  }
  return { id: top.id, name: top.name }
}

/** Every key an instance can be recognised by, and the name a designer knows it as. */
function identify(main: ComponentNode): { keys: string[]; groupKey: string; name: string } {
  const set = main.parent?.type === 'COMPONENT_SET' ? main.parent : null
  return { keys: set ? [main.key, set.key] : [main.key], groupKey: set?.key ?? main.key, name: set?.name ?? main.name }
}

/**
 * A library Icon used only inside library Buttons still counts as used. Each main component
 * is walked once, so a page of a thousand Buttons costs one walk, not a thousand.
 */
async function collectNested(main: ComponentNode, seenKeys: Set<string>, walked: Set<string>): Promise<void> {
  if (walked.has(main.id) || !('findAllWithCriteria' in main)) return
  walked.add(main.id)
  for (const inner of main.findAllWithCriteria({ types: ['INSTANCE'] })) {
    const nested = await inner.getMainComponentAsync()
    if (!nested) continue
    identify(nested).keys.forEach((k) => seenKeys.add(k))
    await collectNested(nested, seenKeys, walked)
  }
}

const value = (origin: 'colour' | 'spacing', v: { key: string; name: string; hint: string }, node: SceneNode, page: string): Hit =>
  ({ origin, groupKey: v.key, name: v.name, hint: v.hint, nodeId: node.id, place: placeOf(node), page })

export interface ScanOutput { hits: Hit[]; seenKeys: Set<string>; bound: number; boundPlaces: BoundPlace[]; visited: number }

/** `components` is null without a library: only the variable half runs. */
export async function scan(scope: Scope, components: readonly LibraryComponent[] | null, scales: Scales, emit: (p: AuditProgress) => void): Promise<ScanOutput> {
  const libraryNames = new Map<string, string>()
  for (const c of components ?? []) for (const k of [c.key, ...c.keys]) libraryNames.set(k, c.name)

  const hits: Hit[] = []
  const seenKeys = new Set<string>()
  const walked = new Set<string>()
  const boundPlaces = new Map<string, BoundPlace>()
  let bound = 0
  let visited = 0
  const roots = rootsOf(scope)
  const skippedBefore = figma.skipInvisibleInstanceChildren
  figma.skipInvisibleInstanceChildren = true

  try {
  for (const [index, root] of roots.entries()) {
    await root.load()
    const before = visited
    const instances: InstanceNode[] = []
    const detached: FrameNode[] = []
    emit({ page: root.pageName, index: index + 1, total: roots.length, visited })
    await traverse(root.nodes, (node) => {
      if (!node.visible) return
      // A component set's purple outline is Figma's, not a design decision.
      if (node.type === 'COMPONENT_SET') return
      // An instance's paints and spacing are its main component's, so it counts once, as a component.
      if (node.type === 'INSTANCE') { if (components) instances.push(node); return }
      if (components && node.type === 'FRAME' && node.detachedInfo) detached.push(node)
      const paints = readNodePaints(node, scales.colours)
      if (paints.bound) {
        bound += paints.bound
        const place = placeOf(node)
        const at = boundPlaces.get(place.id)
        boundPlaces.set(place.id, { place, page: root.pageName, count: (at?.count ?? 0) + paints.bound })
      }
      for (const v of paints.found) hits.push(value('colour', v, node, root.pageName))
      for (const v of readNodeSpacing(node, scales.scale)) hits.push(value('spacing', v, node, root.pageName))
    }, {
      // An instance's own children are its main component's business, not a separate use.
      skipChildren: (node) => node.type === 'INSTANCE' || !node.visible,
      onProgress: (n) => {
        visited = before + n
        emit({ page: root.pageName, index: index + 1, total: roots.length, visited })
      },
    })

    for (const node of instances) {
      const main = await node.getMainComponentAsync()
      const base = { nodeId: node.id, place: placeOf(node), page: root.pageName }
      if (!main) { hits.push({ ...base, origin: 'other', groupKey: `missing:${node.name}`, name: node.name }); continue }
      const { keys, groupKey, name } = identify(main)
      keys.forEach((k) => seenKeys.add(k))
      await collectNested(main, seenKeys, walked)
      const inLibrary = keys.some((k) => libraryNames.has(k))
      hits.push({ ...base, origin: inLibrary ? 'library' : main.remote ? 'other' : 'local', groupKey, name })
    }

    for (const node of detached) {
      const info = node.detachedInfo!
      const base = { nodeId: node.id, place: placeOf(node), page: root.pageName, origin: 'detached' as const }
      if (info.type === 'library') {
        hits.push({ ...base, groupKey: info.componentKey, name: libraryNames.get(info.componentKey) ?? node.name })
      } else {
        const source = await figma.getNodeByIdAsync(info.componentId)
        hits.push({ ...base, groupKey: info.componentId, name: source?.name ?? node.name })
      }
    }
    visited = Math.max(visited, before + instances.length + detached.length)
  }
  } finally {
    figma.skipInvisibleInstanceChildren = skippedBefore
  }
  return { hits, seenKeys, bound, boundPlaces: [...boundPlaces.values()], visited }
}
