// Runs inside Figma: which screens in this file use the components a library release changed.
// A screen is the first layer under a page, looking through sections (see screenOf).
// Read-only. Components are matched by name: the team History records names, not keys.
import type { ImpactResult, ImpactedScreen } from '../messages'

/** Instances looked at across the file before the scan stops; a big file is reported as truncated. */
export const IMPACT_INSTANCE_LIMIT = 4_000

const cleanPageName = (name: string): string => name.replace(/^[\s↳]+/, '').trim()

/**
 * The layer a node belongs to as a screen: the first layer under the page, looking through any
 * sections (sections hold screens, they aren't screens). Frames and groups both count.
 */
export function screenOf(node: BaseNode): SceneNode | null {
  let cur: BaseNode | null = node
  let candidate: BaseNode | null = null
  while (cur?.parent) {
    if (cur.type !== 'SECTION') candidate = cur
    if (cur.parent.type === 'PAGE') return candidate as SceneNode | null
    if (cur.parent.type === 'SECTION') candidate = cur.type === 'SECTION' ? candidate : cur
    cur = cur.parent
  }
  return null
}

/** The name the release uses for an instance's component: its set's name for a variant. */
async function componentName(instance: InstanceNode): Promise<string | null> {
  try {
    const main = await instance.getMainComponentAsync()
    if (!main) return null
    return main.parent?.type === 'COMPONENT_SET' ? main.parent.name : main.name
  } catch {
    return null // a library that isn't loaded
  }
}

interface Found { screen: SceneNode; page: string; uses: ReadonlyMap<string, number> }

/** Walks every page for instances of `names` and groups them by screen, most affected first. */
export async function findImpact(names: readonly string[]): Promise<ImpactResult> {
  const wanted = new Set(names.map((n) => n.trim().toLowerCase()))
  const found = new Map<string, Found>()
  let scanned = 0
  let truncated = false
  const pages = figma.root.children

  for (const page of pages) {
    if (truncated) break
    await page.loadAsync()
    for (const instance of page.findAllWithCriteria({ types: ['INSTANCE'] })) {
      // An instance nested in another instance belongs to that component: its own file is where it
      // changes. It is skipped before counting, so composite components don't use up the limit.
      if (hasInstanceAncestor(instance)) continue
      if (scanned >= IMPACT_INSTANCE_LIMIT) { truncated = true; break }
      scanned += 1
      const name = await componentName(instance)
      if (!name || !wanted.has(name.trim().toLowerCase())) continue
      const screen = screenOf(instance)
      // A component dropped straight on the page is a sample, not a screen.
      if (!screen || screen.id === instance.id) continue
      const entry = found.get(screen.id) ?? { screen, page: cleanPageName(page.name), uses: new Map<string, number>() }
      found.set(screen.id, { ...entry, uses: new Map([...entry.uses, [name, (entry.uses.get(name) ?? 0) + 1]]) })
    }
  }

  const screens: ImpactedScreen[] = [...found.values()]
    .map((f) => ({ nodeId: f.screen.id, name: f.screen.name, page: f.page, uses: [...f.uses].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count) }))
    .sort((a, b) => total(b) - total(a) || a.name.localeCompare(b.name))
  return { screens, pages: pages.length, scanned, truncated }
}

const total = (s: ImpactedScreen): number => s.uses.reduce((sum, u) => sum + u.count, 0)

function hasInstanceAncestor(node: SceneNode): boolean {
  let cur: BaseNode | null = node.parent
  while (cur && cur.type !== 'PAGE') {
    if (cur.type === 'INSTANCE') return true
    cur = cur.parent
  }
  return false
}
