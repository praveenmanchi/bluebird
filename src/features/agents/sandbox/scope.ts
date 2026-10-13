// The roots a run reads for each scope, and the "Ready" summary of them.
import { traverse } from '@shared/figma/traverse'
import { RUN_NODE_LIMIT, type ScopeId, type ScopeInfo } from '../messages'

const isTopLevel = (node: BaseNode): boolean => node.parent?.type === 'PAGE' || node.parent?.type === 'SECTION'

/** The top-level frame holding a layer (or the layer itself when it is one). */
function frameOf(node: SceneNode): SceneNode {
  let cur: SceneNode = node
  while (!isTopLevel(cur) && cur.parent && cur.parent.type !== 'PAGE' && cur.parent.type !== 'DOCUMENT') cur = cur.parent as SceneNode
  return cur
}

/** The nearest section around a layer, else its top-level frame. */
function sectionOf(node: SceneNode): SceneNode {
  let cur: BaseNode | null = node
  while (cur && cur.type !== 'PAGE' && cur.type !== 'DOCUMENT') { if (cur.type === 'SECTION') return cur; cur = cur.parent }
  return frameOf(node)
}

const unique = (nodes: readonly SceneNode[]): SceneNode[] => [...new Map(nodes.map((n) => [n.id, n])).values()]

/** What a scope resolves to on the current page. Empty for selection scopes with nothing selected. */
export function scopeRoots(scope: ScopeId): readonly SceneNode[] {
  const selection = figma.currentPage.selection
  switch (scope) {
    case 'page': return figma.currentPage.children
    case 'selection': return selection
    case 'frame': return unique(selection.map(frameOf))
    case 'section': return unique(selection.map(sectionOf))
  }
}

export function scopeName(scope: ScopeId, roots: readonly SceneNode[]): string {
  if (scope === 'page') return figma.currentPage.name
  if (roots.length === 0) return 'Nothing selected'
  return roots.length === 1 ? roots[0]!.name : `${roots.length} layers`
}

const isFrameLike = (node: SceneNode) => node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE' || node.type === 'SECTION' || node.type === 'COMPONENT_SET'

/** Counts for the Scope row and the Setup meta line. Capped like a run is. */
export async function describeScope(scope: ScopeId): Promise<ScopeInfo> {
  const roots = scopeRoots(scope)
  let frames = 0
  let textLayers = 0
  let instances = 0
  let truncated = false
  const layers = await traverse(roots, (node) => {
    if (!node.visible) return
    if (node.type === 'TEXT') textLayers += 1
    if (node.type === 'INSTANCE') instances += 1
    if (isFrameLike(node) && (node.parent?.type === 'PAGE' || node.parent?.type === 'SECTION' || roots.includes(node))) frames += 1
  }, { skipChildren: (node) => !node.visible, onProgress: (visited) => { if (visited >= RUN_NODE_LIMIT) { truncated = true; return false } } })
  return { scope, name: scopeName(scope, roots), frames: Math.max(frames, roots.length ? 1 : 0), layers, textLayers, instances, truncated, empty: roots.length === 0 }
}
