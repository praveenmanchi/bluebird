// Runs inside Figma: lists the file's pages and reads the facts the hand-off
// audit is built from (model.ts turns them into findings).
import { traverse } from '@shared/figma/traverse'
import type { PageInfo, PageScan, ScreenScan, Tier } from '../types'

/** Pages the hand-off itself creates are not offered for a hand-off. */
export const HANDOFF_PREFIX = 'Handoff · '
const DEFAULT_NAME = /^(Frame|Group|Rectangle|Ellipse|Vector|Line|Polygon|Star) \d+$/
/** Per screen: enough to show and count, without holding thousands of ids. */
const CAP = 200

const tidy = (name: string): string => name.replace(/^[\s↳]+/, '').trim()

/** Top-level frames, and frames placed in sections. */
export function screensOf(page: PageNode): FrameNode[] {
  const out: FrameNode[] = []
  for (const node of page.children) {
    if (node.type === 'FRAME') out.push(node)
    else if (node.type === 'SECTION') for (const child of node.children) if (child.type === 'FRAME') out.push(child)
  }
  return out
}

export async function listPages(): Promise<PageInfo[]> {
  const pages: PageInfo[] = []
  for (const page of figma.root.children) {
    if (page.name.startsWith(HANDOFF_PREFIX)) continue
    await page.loadAsync()
    const screens = screensOf(page).length
    if (screens) pages.push({ id: page.id, name: tidy(page.name), screens, flows: page.flowStartingPoints.length })
  }
  return pages
}

function tierOf(page: string): Tier {
  const name = page.toLowerCase()
  return name.includes('atom') ? 'atoms' : name.includes('molecule') ? 'molecules' : name.includes('organism') ? 'organisms' : name.includes('icon') ? 'icons' : 'other'
}

function pageOf(node: BaseNode): string {
  let current: BaseNode | null = node
  while (current && current.type !== 'PAGE') current = current.parent
  return current?.name ?? ''
}

async function scanScreen(screen: FrameNode, page: string, destinations: Set<string>): Promise<{ scan: ScreenScan; links: number }> {
  const unboundGaps: Array<{ id: string; name: string; gap: number }> = []
  const frames: Array<{ id: string; name: string }> = []
  const defaultNamed: Array<{ id: string; name: string }> = []
  const instances: InstanceNode[] = []
  let rawColors = 0, rawTextSizes = 0, links = 0

  await traverse([screen], (node) => {
    if ('reactions' in node) {
      for (const reaction of node.reactions) {
        for (const action of reaction.actions ?? []) {
          if (action.type === 'NODE' && action.destinationId) { links += 1; destinations.add(action.destinationId) }
        }
      }
    }
    if (node.type === 'INSTANCE') { instances.push(node); return }
    if (DEFAULT_NAME.test(node.name) && defaultNamed.length < CAP) defaultNamed.push({ id: node.id, name: node.name })
    const bound = (node.boundVariables ?? {}) as Record<string, unknown>
    if (node.type === 'FRAME') {
      if (node.layoutMode !== 'NONE' && node.itemSpacing > 0 && node.children.length > 1 && node.primaryAxisAlignItems !== 'SPACE_BETWEEN' && !bound.itemSpacing && unboundGaps.length < CAP) {
        unboundGaps.push({ id: node.id, name: node.name, gap: node.itemSpacing })
      }
      if (node !== screen && node.children.length > 0 && !DEFAULT_NAME.test(node.name) && frames.length < CAP) frames.push({ id: node.id, name: node.name })
    }
    if ('fills' in node && Array.isArray(node.fills) && node.fills.some((p: Paint) => p.type === 'SOLID' && p.visible !== false) && !bound.fills && !('fillStyleId' in node && node.fillStyleId)) rawColors += 1
    if (node.type === 'TEXT' && !node.textStyleId && !bound.fontSize) rawTextSizes += 1
  }, { skipChildren: (node) => node.type === 'INSTANCE' })

  // A repeated frame is one-per-screen at most: the same name twice on one screen is a list, not a missing component.
  const uniqueFrames = [...new Map(frames.map((f) => [f.name, f])).values()]
  const components = new Map<string, { name: string; tier: Tier }>()
  for (const instance of instances) {
    const main = await instance.getMainComponentAsync()
    if (!main) continue
    const owner = main.parent?.type === 'COMPONENT_SET' ? main.parent : main
    if (!components.has(owner.id)) components.set(owner.id, { name: owner.name, tier: main.remote ? 'other' : tierOf(pageOf(owner)) })
  }
  return { scan: { id: screen.id, name: screen.name, page, unboundGaps, frames: uniqueFrames, defaultNamed, rawColors, rawTextSizes, linked: links > 0, components: [...components.values()] }, links }
}

export async function scanPages(pageIds: readonly string[]): Promise<PageScan[]> {
  const out: PageScan[] = []
  for (const id of pageIds) {
    const page = await figma.getNodeByIdAsync(id)
    if (!page || page.type !== 'PAGE') continue
    await page.loadAsync()
    const destinations = new Set<string>()
    const scanned: ScreenScan[] = []
    let links = 0
    for (const screen of screensOf(page)) {
      const result = await scanScreen(screen, tidy(page.name), destinations)
      scanned.push(result.scan)
      links += result.links
    }
    // A screen other screens navigate to is in the prototype even with no link of its own.
    out.push({ id: page.id, name: tidy(page.name), flows: page.flowStartingPoints.length, links, screens: scanned.map((s) => destinations.has(s.id) ? { ...s, linked: true } : s) })
  }
  return out
}
