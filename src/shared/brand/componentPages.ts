// Where the main components live in the Figma file. Shared by both extractors (Plugin API and REST),
// so they agree on which components exist and how coverage rows are labelled.
//
//   legacy   one "Components" page: sets at the top level or directly inside "⚛️ Atoms" etc. sections
//   tiered   one page per tier (Atoms, Molecules, Organisms, Icons). Sections group by tab, and each
//            main component sits inside a Doc/<Name> frame (Header, Stage, Specs), so it is nested.

export interface PageRef { id: string; name: string }

/** The structural subset both Plugin API nodes and REST nodes share. */
export interface TreeNode { id: string; name: string; type: string; children?: readonly TreeNode[] }

export type LayoutKind = 'legacy' | 'tiered'
export interface PageLayout { kind: LayoutKind; pages: PageRef[] }
export interface PageSource<N extends TreeNode> { kind: LayoutKind; pages: readonly N[] }

export interface LayoutManifest {
  componentsPage: PageRef
  /** Tier pages, in order. Absent, or not yet in the file → the legacy componentsPage is used. */
  componentPages?: readonly PageRef[]
}

/** A main component and where it sits. tier = page label (tiered) or section label (legacy); group = the
 *  tab section it is filed under (tiered only). */
export interface Placed<N extends TreeNode> { node: N; tier: string | null; group: string | null }

const LEGACY_COVERAGE = /Atoms|Molecules|Organisms/

/** "  ↳ Atoms" → "Atoms": the page list indents sub-pages with an arrow. */
export const pageLabel = (name: string): string => name.replace(/^[\s↳]+/, '').trim()

/** "⚛️ Atoms" → "Atoms", as legacy coverage rows have always been labelled. */
const legacySectionLabel = (name: string): string => name.replace(/^\S+\s/, '')

const isMain = (n: TreeNode): boolean => n.type === 'COMPONENT_SET' || n.type === 'COMPONENT'

/** Pick the layout the file actually has. Tier pages are matched by id, then by label (ids can change
 *  when a branch is merged). All found → tiered; none found → legacy; some found → error, because a
 *  half-migrated file would silently drop components from the snapshot. */
export function resolveLayout(manifest: LayoutManifest, filePages: readonly PageRef[]): PageLayout {
  const tiers = manifest.componentPages ?? []
  if (tiers.length) {
    const find = (ref: PageRef) => filePages.find((p) => p.id === ref.id) ?? filePages.find((p) => pageLabel(p.name) === pageLabel(ref.name))
    const found = tiers.map((ref) => ({ ref, page: find(ref) }))
    const missing = found.filter((f) => !f.page).map((f) => `${f.ref.name} (${f.ref.id})`)
    if (!missing.length) return { kind: 'tiered', pages: found.map((f) => ({ id: f.page!.id, name: pageLabel(f.ref.name) })) }
    if (missing.length < tiers.length) throw new Error(`Component pages missing from the file: ${missing.join(', ')}. Fix componentPages in figma/manifest.json.`)
  }
  return { kind: 'legacy', pages: [manifest.componentsPage] }
}

/** Main components under a node, depth first: sets and standalone components. Never descends into a
 *  component (its variants are not main components here) or an instance (nested copies). */
export function mainComponents<N extends TreeNode>(root: N): N[] {
  if (isMain(root)) return [root]
  if (root.type === 'INSTANCE') return []
  return ((root.children ?? []) as readonly N[]).flatMap((c) => mainComponents(c))
}

function placeLegacy<N extends TreeNode>(page: N): Placed<N>[] {
  const out: Placed<N>[] = []
  for (const top of (page.children ?? []) as readonly N[]) {
    if (top.type === 'SECTION') {
      for (const child of (top.children ?? []) as readonly N[]) if (isMain(child)) out.push({ node: child, tier: legacySectionLabel(top.name), group: null })
    } else if (isMain(top)) out.push({ node: top, tier: null, group: null })
  }
  return out
}

function placeTiered<N extends TreeNode>(page: N, tier: string): Placed<N>[] {
  return ((page.children ?? []) as readonly N[]).flatMap((top) =>
    mainComponents(top).map((node) => ({ node, tier, group: top.type === 'SECTION' ? top.name.trim() : null })))
}

/** Every main component on the layout's pages. `refs` carries the tier names, index-aligned with `source.pages`. */
export function placeComponents<N extends TreeNode>(source: PageSource<N>, refs: readonly PageRef[]): Placed<N>[] {
  return source.pages.flatMap((page, i) => source.kind === 'legacy' ? placeLegacy(page) : placeTiered(page, refs[i]?.name ?? pageLabel(page.name)))
}

/** Legacy coverage only counted the three tier sections; on tier pages every main component counts. */
export function inCoverage(kind: LayoutKind, placed: Placed<TreeNode>): boolean {
  return kind === 'tiered' || (placed.tier !== null && LEGACY_COVERAGE.test(placed.tier))
}
