// What a scan of the current scope would read, for Ready to scan's heading and
// counts ("1 frame selected · 214 text layers · 38 component instances"). Works
// on a minimal node shape so it runs on Figma nodes and on plain objects in tests.
import { TARGET_NODE_LIMIT, type ScanScope, type ScanTarget } from './messages'

export interface SummaryNode {
  readonly type: string
  readonly name: string
  readonly visible?: boolean
  readonly children?: readonly SummaryNode[]
}

const FRAME_TYPES = new Set(['FRAME', 'COMPONENT', 'COMPONENT_SET', 'SECTION'])

/** Counts text layers and instances under the roots (hidden layers skipped, as the scan skips them). */
export function summarizeScope(scope: ScanScope, roots: readonly SummaryNode[], pageName: string, limit = TARGET_NODE_LIMIT): ScanTarget {
  let textLayers = 0
  let instances = 0
  let walked = 0
  const stack = roots.filter((r) => r.visible !== false).slice().reverse()
  while (stack.length && walked < limit) {
    const node = stack.pop()!
    walked++
    if (node.type === 'TEXT') textLayers++
    if (node.type === 'INSTANCE') instances++
    for (const child of [...(node.children ?? [])].reverse()) if (child.visible !== false) stack.push(child)
  }
  const name = scope === 'page' ? pageName : roots.length === 1 ? roots[0]!.name : `${roots.length} layers`
  return {
    scope, name, selected: roots.length, frames: roots.filter((r) => FRAME_TYPES.has(r.type)).length,
    textLayers, instances, truncated: stack.length > 0,
  }
}

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`

/** "1 frame selected · 214 text layers · 38 component instances". */
export function describeTarget(t: ScanTarget): string {
  const what = t.scope === 'page'
    ? 'Whole page'
    : t.frames === t.selected ? `${plural(t.selected, 'frame')} selected` : `${plural(t.selected, 'layer')} selected`
  const more = t.truncated ? '+' : ''
  return `${what} · ${plural(t.textLayers, 'text layer')}${more} · ${plural(t.instances, 'component instance')}${more}`
}
