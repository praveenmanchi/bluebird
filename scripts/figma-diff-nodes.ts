// Match the layers of one Figma variant across two snapshots.
//
// Snapshots that record node ids (both extractors do since 2026-09) are matched by id, which
// is exact through renames. Older snapshots fall back to the path `p` ("WCAG Card/Header/Rating"):
// an exact match handles everything except a renamed layer. For the leftovers we score
// candidate pairs within the same parent and, on a match, rewrite the paths of the
// whole before-side subtree — so one renamed container costs one finding instead of
// forty. See `matchNodes` for the scoring weights and their limits.
import type { ComponentNode } from '../src/shared/brand/snapshot'

export interface NodePair { before: ComponentNode; after: ComponentNode }
export interface NodeRename extends NodePair { confidence: 'exact' | 'heuristic'; score: number }
export interface NodeMatch {
  /** Same path on both sides (after rename propagation). */
  pairs: NodePair[]
  renames: NodeRename[]
  added: ComponentNode[]
  removed: ComponentNode[]
}

const MIN_SCORE = 4
/** Binding overlap this strong means the layer is certainly the same one, just renamed. */
const STRONG_OVERLAP = 0.75

const depthOf = (p: string) => p.split('/').length
const parentOf = (p: string) => p.slice(0, p.lastIndexOf('/'))

function jaccard(a: readonly string[], b: readonly string[]): number {
  if (!a.length && !b.length) return 0
  const setB = new Set(b)
  const shared = new Set(a.filter((x) => setB.has(x))).size
  const union = new Set([...a, ...b]).size
  return union ? shared / union : 0
}

/** How alike are two layers, ignoring their names? Binding *values* dominate: a layer keeps
 *  pointing at the same Figma variables across a rename far more reliably than it keeps its
 *  type, index or raw values. */
export function similarity(a: ComponentNode, b: ComponentNode): number {
  if (a.t !== b.t) return 0
  let score = 4 * jaccard(Object.values(a.b), Object.values(b.b))
  score += 2 * jaccard(Object.keys(a.b), Object.keys(b.b))
  score += 2 * jaccard(Object.keys(a.r ?? {}), Object.keys(b.r ?? {}))
  if (a.i && a.i === b.i) score += 1
  return score
}

function bindingOverlap(a: ComponentNode, b: ComponentNode): number {
  return jaccard(Object.values(a.b), Object.values(b.b))
}

/**
 * Pair the layers of one variant across two snapshots.
 *
 * Known limits, by design rather than oversight:
 * - A layer renamed *and* rebound in the same edit scores below the threshold and comes back as
 *   removed + added. The union of those two findings still says exactly what to do.
 * - Two identical unbound siblings (spacers, wrapper frames) score the same, so a reorder of the
 *   two reports as two renames. Harmless — their content is identical — but it reads oddly.
 * - A deleted layer plus a new one of the same type at the same index is genuinely ambiguous with a
 *   rename. Those come back tagged `confidence: 'heuristic'` so a reader can discount them.
 */
export function matchNodes(before: readonly ComponentNode[], after: readonly ComponentNode[]): NodeMatch {
  // Snapshots with node ids identify layers outright: a same-id pair is the same layer whatever its
  // path became. Only layers without an id (older snapshots) go through the path heuristics below.
  const afterById = new Map(after.filter((n) => n.id).map((n) => [n.id!, n]))
  const byId = before.filter((n) => n.id && afterById.has(n.id)).map((n) => ({ before: n, after: afterById.get(n.id!)! }))
  // A renamed container moves every descendant's path; only the container is the rename, so a
  // descendant whose path follows from an ancestor's rename is an ordinary pair.
  const renamedPrefix = new Map<string, string>()
  const idPairs: NodePair[] = []
  const idRenames: NodeRename[] = []
  for (const x of [...byId].sort((a, b) => depthOf(a.before.p) - depthOf(b.before.p))) {
    if (followRenames(x.before.p, renamedPrefix) === x.after.p) { idPairs.push(x); continue }
    idRenames.push({ ...x, confidence: 'exact', score: Infinity })
    renamedPrefix.set(x.before.p, x.after.p)
  }
  if (byId.length) {
    const matchedBefore = new Set(byId.map((x) => x.before))
    const matchedAfter = new Set(byId.map((x) => x.after))
    // A new id on one side is a genuinely new (or deleted) layer, not a rename candidate.
    const rest = matchByPath(before.filter((n) => !matchedBefore.has(n) && !n.id), after.filter((n) => !matchedAfter.has(n) && !n.id))
    return {
      pairs: [...idPairs, ...rest.pairs],
      renames: [...idRenames, ...rest.renames],
      added: [...after.filter((n) => n.id && !matchedAfter.has(n)), ...rest.added],
      removed: [...before.filter((n) => n.id && !matchedBefore.has(n)), ...rest.removed],
    }
  }
  return matchByPath(before, after)
}

/** Rewrite `path` through the deepest renamed ancestor, if any. */
function followRenames(path: string, renamed: ReadonlyMap<string, string>): string {
  // `parentOf` assumes a "/" — walk ancestors only while there is one.
  for (let p = path; p.includes('/');) {
    p = parentOf(p)
    const to = renamed.get(p)
    if (to !== undefined) return `${to}${path.slice(p.length)}`
  }
  return path
}

function matchByPath(before: readonly ComponentNode[], after: readonly ComponentNode[]): NodeMatch {
  const pairs: NodePair[] = []
  const renames: NodeRename[] = []
  // Before-side paths are rewritten in place as ancestors turn out to be renames.
  const pending = new Map<string, ComponentNode>(before.map((n) => [n.p, n]))
  const afterByPath = new Map<string, ComponentNode>(after.map((n) => [n.p, n]))
  const unmatchedAfter = new Set(after.map((n) => n.p))
  const maxDepth = Math.max(0, ...before.map((n) => depthOf(n.p)), ...after.map((n) => depthOf(n.p)))

  for (let depth = 1; depth <= maxDepth; depth++) {
    // 1. exact paths — absorbs every subtree whose ancestors already matched
    for (const [path, node] of [...pending]) {
      if (depthOf(path) !== depth) continue
      const hit = afterByPath.get(path)
      if (!hit || !unmatchedAfter.has(path)) continue
      pairs.push({ before: node, after: hit })
      pending.delete(path)
      unmatchedAfter.delete(path)
    }

    // 2. leftovers at this depth, scored within the same parent
    const leftBefore = [...pending.entries()].filter(([p]) => depthOf(p) === depth).map(([path, node]) => ({ path, node }))
    const leftAfter = [...unmatchedAfter].filter((p) => depthOf(p) === depth).map((p) => ({ path: p, node: afterByPath.get(p)! }))
    if (!leftBefore.length || !leftAfter.length) continue

    // Index among the *still unmatched* siblings, so a stable layer that already matched does not shift it.
    const indexIn = (list: readonly { path: string }[], path: string) => list.filter((x) => parentOf(x.path) === parentOf(path)).findIndex((x) => x.path === path)
    const candidates: { path: string; before: ComponentNode; after: ComponentNode; score: number }[] = []
    for (const b of leftBefore) {
      for (const a of leftAfter) {
        if (parentOf(b.path) !== parentOf(a.path)) continue
        let score = similarity(b.node, a.node)
        if (score === 0) continue
        if (indexIn(leftBefore, b.path) === indexIn(leftAfter, a.path)) score += 3
        if (score >= MIN_SCORE) candidates.push({ path: b.path, before: b.node, after: a.node, score })
      }
    }
    candidates.sort((x, y) => y.score - x.score)
    const takenBefore = new Set<string>()
    const takenAfter = new Set<string>()
    for (const c of candidates) {
      if (takenBefore.has(c.path) || takenAfter.has(c.after.p)) continue
      takenBefore.add(c.path)
      takenAfter.add(c.after.p)
      renames.push({ before: c.before, after: c.after, score: c.score, confidence: bindingOverlap(c.before, c.after) >= STRONG_OVERLAP ? 'exact' : 'heuristic' })
      pending.delete(c.path)
      unmatchedAfter.delete(c.after.p)
      // propagate: every deeper before-side path under the old name now lives under the new one
      const oldPrefix = `${c.path}/`
      const newPrefix = `${c.after.p}/`
      for (const [p, n] of [...pending]) {
        if (!p.startsWith(oldPrefix)) continue
        pending.delete(p)
        pending.set(newPrefix + p.slice(oldPrefix.length), n)
      }
    }
  }

  return {
    pairs,
    renames,
    added: [...unmatchedAfter].map((p) => afterByPath.get(p)!),
    removed: [...pending.values()],
  }
}
