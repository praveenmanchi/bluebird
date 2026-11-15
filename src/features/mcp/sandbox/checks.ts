// Handoff readiness, as plain data. `collectInventory` (inspect.ts) runs inside
// Figma; `evaluate` only ever sees this shape, so the rules are unit-testable
// without the figma global — the same split the UX AI agents use.
import type { CheckResult, CheckStats, HandoffCheck, UsedComponent } from '../messages'

export interface HandoffInventory {
  nodeId: string
  name: string
  type: string
  description: string
  layers: number
  /** Component instances inside the selection (and the selection itself when it is one). */
  instanceList: ReadonlyArray<{ name: string; remote: boolean }>
  /** Frames Figma flags as detached instances. */
  detached: readonly string[]
  /** Frame-like layers (frames, components, instances with children) and how many use auto layout. */
  frames: number
  autoLayout: number
  /** Frames without auto layout, by name. */
  absolute: readonly string[]
  /** Solid fills and strokes: bound to a variable, or raw with their hex. */
  boundPaints: number
  rawPaints: readonly string[]
  /** Gaps, paddings and radii: bound to a variable, or raw with their value. */
  boundNumbers: number
  rawNumbers: readonly number[]
  /** Text layers: with a text style or typography variables, or without (by name). */
  texts: number
  unstyledTexts: readonly string[]
  /** Layers still called "Frame 12", "Rectangle 3"… */
  defaultNames: readonly string[]
}

/** Figma's auto-generated layer names. */
export const DEFAULT_NAME = /^(?:Frame|Group|Rectangle|Ellipse|Vector|Line|Polygon|Star|Text|Section|Slice|Union|Subtract|Intersect|Exclude|Boolean|Arrow|Component|Instance)(?: \d+)?$/

const MAX_NAMES = 3
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const list = (names: readonly string[]): string => names.length <= MAX_NAMES ? names.join(', ') : `${names.slice(0, MAX_NAMES).join(', ')} +${names.length - MAX_NAMES}`

/** Readiness points: a failing check locks Generate, a warning only lowers the score. */
export const FAIL_COST = 25
export const WARNING_COST = 8

function components(inv: HandoffInventory): HandoffCheck {
  if (inv.detached.length) return { id: 'components', status: 'fail', title: 'Components', detail: `${plural(inv.detached.length, 'detached instance')}: ${list(inv.detached)}`, actionLabel: 'Reattach' }
  const total = inv.instanceList.length
  if (!total) return { id: 'components', status: 'warning', title: 'Components', detail: 'No library components — the generated code starts from primitives', actionLabel: 'Swap' }
  const local = inv.instanceList.filter((i) => !i.remote)
  if (local.length) return { id: 'components', status: 'warning', title: 'Components', detail: `${local.length} of ${total} instances come from local components, not the library: ${list([...new Set(local.map((i) => i.name))])}`, actionLabel: 'Publish' }
  return { id: 'components', status: 'pass', title: 'Components', detail: `${total} of ${total} instances come from the library` }
}

function variables(inv: HandoffInventory): HandoffCheck {
  const raw = inv.rawPaints.length + inv.rawNumbers.length
  const bound = inv.boundPaints + inv.boundNumbers
  const total = raw + bound
  if (!total) return { id: 'variables', status: 'pass', title: 'Variables', detail: 'Nothing to bind — no colours, spacing or radii of its own' }
  if (!raw) return { id: 'variables', status: 'pass', title: 'Variables', detail: `100% bound to variables · ${plural(total, 'binding')}` }
  const pct = Math.round((bound / total) * 100)
  const parts = [inv.rawPaints.length ? `${plural(inv.rawPaints.length, 'raw colour')} (${list([...new Set(inv.rawPaints)])})` : '', inv.rawNumbers.length ? `${plural(inv.rawNumbers.length, 'unbound gap')} (${list([...new Set(inv.rawNumbers)].map((n) => `${n}px`))})` : ''].filter(Boolean)
  if (pct >= 80) return { id: 'variables', status: 'warning', title: 'Variables', detail: `${pct}% bound to variables · ${parts.join(' · ')}`, actionLabel: 'Fix' }
  return { id: 'variables', status: 'fail', title: 'Variables', detail: `Only ${pct}% bound to variables · ${parts.join(' · ')}`, actionLabel: 'Fix all' }
}

function autoLayout(inv: HandoffInventory): HandoffCheck {
  if (!inv.frames) return { id: 'auto-layout', status: 'pass', title: 'Auto layout', detail: 'No frames to lay out' }
  if (!inv.absolute.length) return { id: 'auto-layout', status: 'pass', title: 'Auto layout', detail: 'Every frame uses auto layout' }
  return { id: 'auto-layout', status: 'warning', title: 'Auto layout', detail: `${inv.absolute.length} of ${plural(inv.frames, 'frame')} use absolute positioning: ${list(inv.absolute)}`, actionLabel: 'Add auto layout' }
}

function text(inv: HandoffInventory): HandoffCheck {
  if (!inv.texts) return { id: 'text', status: 'pass', title: 'Typography', detail: 'No text layers' }
  if (!inv.unstyledTexts.length) return { id: 'text', status: 'pass', title: 'Typography', detail: `${plural(inv.texts, 'text layer')} use text styles or typography variables` }
  return { id: 'text', status: 'warning', title: 'Typography', detail: `${inv.unstyledTexts.length} of ${plural(inv.texts, 'text layer')} have no text style: ${list(inv.unstyledTexts)}`, actionLabel: 'Apply style' }
}

function naming(inv: HandoffInventory): HandoffCheck {
  if (!inv.defaultNames.length) return { id: 'naming', status: 'pass', title: 'Layer names', detail: 'Every layer is named — names become class and prop names' }
  return { id: 'naming', status: 'warning', title: 'Layer names', detail: `${plural(inv.defaultNames.length, 'layer')} keep Figma’s default name: ${list(inv.defaultNames)}`, actionLabel: 'Rename' }
}

function description(inv: HandoffInventory): HandoffCheck | null {
  if (inv.type !== 'COMPONENT' && inv.type !== 'COMPONENT_SET') return null
  if (inv.description.trim()) return { id: 'description', status: 'pass', title: 'Description', detail: 'The component description becomes the generated doc comment' }
  return { id: 'description', status: 'warning', title: 'Description', detail: 'No description — say what the component is for and when to use it', actionLabel: 'Describe' }
}

export function stats(inv: HandoffInventory): CheckStats {
  return {
    layers: inv.layers,
    instances: inv.instanceList.length,
    libraryInstances: inv.instanceList.filter((i) => i.remote).length,
    detached: inv.detached.length,
    frames: inv.frames,
    autoLayout: inv.autoLayout,
    boundPaints: inv.boundPaints,
    rawPaints: inv.rawPaints.length,
    boundNumbers: inv.boundNumbers,
    rawNumbers: inv.rawNumbers.length,
    texts: inv.texts,
    styledTexts: inv.texts - inv.unstyledTexts.length,
    defaultNames: inv.defaultNames.length,
  }
}

/** The components the selection is built from, most used first; one is "library" only when every instance of it is. */
export function usedComponents(inv: HandoffInventory): UsedComponent[] {
  const names = [...new Set(inv.instanceList.map((i) => i.name))]
  return names
    .map((name) => {
      const uses = inv.instanceList.filter((i) => i.name === name)
      return { name, count: uses.length, library: uses.every((i) => i.remote) }
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

/** The checks and the readiness score they add up to. */
export function evaluate(inv: HandoffInventory): CheckResult {
  const checks = [components(inv), variables(inv), autoLayout(inv), text(inv), naming(inv), description(inv)].filter((c): c is HandoffCheck => c !== null)
  const fails = checks.filter((c) => c.status === 'fail').length
  const warnings = checks.filter((c) => c.status === 'warning').length
  const value = Math.max(0, 100 - fails * FAIL_COST - warnings * WARNING_COST)
  const tone = fails ? 'danger' : value < 85 ? 'warning' : 'success'
  return { nodeId: inv.nodeId, readiness: { tone, value }, checks, stats: stats(inv), components: usedComponents(inv) }
}
