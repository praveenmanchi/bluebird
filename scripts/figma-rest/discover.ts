// Walk the Components page: coverage rows (mirrors extract.ts extractCoverage), component sets the
// manifest does not map yet, and manifest entries whose node id no longer exists. Works on every
// plan — it only needs /v1/files/:key/nodes.
import type { CoverageRow } from '../../src/shared/brand/snapshot'
import { pluginBindings } from './normalize'
import type { RestNode } from './types'

const COVERAGE_SECTIONS = /Atoms|Molecules|Organisms/
const isComponent = (n: RestNode) => n.type === 'COMPONENT' || n.type === 'COMPONENT_SET'

export interface DiscoveredSet { id: string; name: string; type: string; section: string | null; variants: number }

export interface ManifestEntry { code: string; figma: string; id: string }

export interface Reconciliation {
  /** Manifest entries whose id is gone but a set with the same Figma name exists: the new id. */
  moved: { code: string; figma: string; from: string; to: string }[]
  /** Manifest entries whose id is gone and no set carries the name. */
  missing: ManifestEntry[]
  /** Component sets on the page that no manifest entry maps. */
  unmapped: DiscoveredSet[]
}

/** Every component (set) at the top of the page or directly inside one of its sections. */
export function discoverSets(page: RestNode): DiscoveredSet[] {
  const out: DiscoveredSet[] = []
  const add = (n: RestNode, section: string | null) => {
    if (isComponent(n)) out.push({ id: n.id, name: n.name.trim(), type: n.type, section, variants: n.type === 'COMPONENT_SET' ? (n.children ?? []).length : 1 })
  }
  for (const top of page.children ?? []) {
    if (top.type === 'SECTION') for (const child of top.children ?? []) add(child, sectionLabel(top.name))
    else add(top, null)
  }
  return out
}

/** "⚛️ Atoms" → "Atoms", as extract.ts labels coverage rows. */
const sectionLabel = (name: string) => name.replace(/^\S+\s/, '')

function* descendants(node: RestNode): Generator<RestNode> {
  yield node
  for (const c of node.children ?? []) yield* descendants(c)
}

/** Mirrors extract.ts `coverageOf`: bound vs raw fills, strokes, radii, spacing and text. */
export function coverageOf(top: RestNode): { bound: number; raw: number } {
  let bound = 0
  let raw = 0
  const count = (isBound: boolean) => { if (isBound) bound++; else raw++ }
  for (const n of descendants(top)) {
    const bv = pluginBindings(n.boundVariables)
    for (const f of n.fills ?? []) if (f.type === 'SOLID' && f.visible !== false) count(!!f.boundVariables?.color)
    for (const s of n.strokes ?? []) if (s.type === 'SOLID' && s.visible !== false) count(!!s.boundVariables?.color)
    if (typeof n.cornerRadius === 'number' && n.cornerRadius > 0) count(!!bv.topLeftRadius)
    if (n.layoutMode && n.layoutMode !== 'NONE') for (const k of ['itemSpacing', 'paddingLeft', 'paddingTop', 'paddingRight', 'paddingBottom'] as const) if ((n[k] ?? 0) > 0) count(!!bv[k])
    if (n.type === 'TEXT') count(!!(bv.fontSize || bv.fontFamily))
  }
  return { bound, raw }
}

export function coverageRows(page: RestNode): CoverageRow[] {
  const rows: CoverageRow[] = []
  for (const section of page.children ?? []) {
    if (section.type !== 'SECTION' || !COVERAGE_SECTIONS.test(section.name)) continue
    for (const top of section.children ?? []) {
      if (!isComponent(top)) continue
      const { bound, raw } = coverageOf(top)
      rows.push({
        section: sectionLabel(section.name), type: top.type, name: top.name.trim(), id: top.id,
        variants: top.type === 'COMPONENT_SET' ? (top.children ?? []).length : 1,
        coverage: bound + raw ? Math.round((100 * bound) / (bound + raw)) : null,
      })
    }
  }
  return rows
}

/** Compare the manifest against what the file actually holds. `found` = ids the API returned;
 *  `alsoClaimed` = ids the manifest maps outside componentSets. */
export function reconcile(entries: readonly ManifestEntry[], found: ReadonlySet<string>, discovered: readonly DiscoveredSet[], alsoClaimed: readonly string[] = []): Reconciliation {
  const byName = new Map<string, DiscoveredSet[]>()
  for (const d of discovered) byName.set(d.name, [...(byName.get(d.name) ?? []), d])
  const mapped = new Set(entries.map((e) => e.id))
  const moved: Reconciliation['moved'] = []
  const missing: ManifestEntry[] = []
  for (const e of entries) {
    if (found.has(e.id)) continue
    const candidates = (byName.get(e.figma.trim()) ?? []).filter((d) => !mapped.has(d.id))
    // Only a unique name match is safe to follow; two sets with one name need a human.
    if (candidates.length === 1) moved.push({ code: e.code, figma: e.figma, from: e.id, to: candidates[0]!.id })
    else missing.push(e)
  }
  // Sets the manifest uses for something else (the icon set, brand logos) are mapped too.
  const claimed = new Set([...mapped, ...moved.map((m) => m.to), ...alsoClaimed])
  return { moved, missing, unmapped: discovered.filter((d) => !claimed.has(d.id)) }
}
