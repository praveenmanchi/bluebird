// Chunked, cancellable traversal for the sandbox. Yields to the event loop
// between batches so a 5,000-node page never freezes the plugin.

export interface TraverseOptions {
  /** Nodes visited per batch before yielding. */
  batchSize?: number
  /** Called after each batch; return false to stop early. */
  onProgress?: (visited: number) => boolean | void
  /** Skip children of this node (still visits the node itself). */
  skipChildren?: (node: SceneNode) => boolean
}

const yieldToHost = () => new Promise<void>((r) => setTimeout(r, 0))

/** Depth-first walk over `roots`, calling `visit` on every node including roots. */
export async function traverse(
  roots: readonly SceneNode[],
  visit: (node: SceneNode) => void,
  options: TraverseOptions = {},
): Promise<number> {
  const batchSize = options.batchSize ?? 400
  const stack: SceneNode[] = [...roots].reverse()
  let visited = 0
  let sinceYield = 0

  while (stack.length) {
    const node = stack.pop()!
    visit(node)
    visited += 1
    sinceYield += 1

    if ('children' in node && !options.skipChildren?.(node)) {
      for (let i = node.children.length - 1; i >= 0; i -= 1) stack.push(node.children[i]!)
    }
    if (sinceYield >= batchSize) {
      sinceYield = 0
      if (options.onProgress?.(visited) === false) break
      await yieldToHost()
    }
  }
  options.onProgress?.(visited)
  return visited
}

/** Roots for a scan scope: current selection, or the current page's top-level nodes. */
export function scopeRoots(scope: 'selection' | 'page'): readonly SceneNode[] {
  if (scope === 'selection' && figma.currentPage.selection.length) return figma.currentPage.selection
  return figma.currentPage.children
}
