// The developer spec's content (Figma "Accessibility spec · Results", 40002672:29080):
// what each control is, how it is named, which states and keys it needs, and what the
// spec still depends on. Pure: the sandbox collects the layers, this decides.
import { standardLabel, type StandardId } from '../standards'
import { PLATFORM_TARGETS, type Platform } from '../target'
import { ROLE_INFO, humanName, notesFor, type ControlRole, type ImplementationNote } from './spec-roles'
import type { Badge, DocDetail } from './types'

export interface Rect { x: number; y: number; width: number; height: number }

/** One interactive layer found in the screen, as the sandbox read it. */
export interface CollectedControl {
  nodeId: string
  /** The layer's own name. */
  name: string
  /** The main component (or its set) — what the developer imports. Absent for a plain frame. */
  component?: string
  role: ControlRole
  /** Visible text inside it, joined; empty for an icon-only control. */
  text: string
  /** The values of the component set's State-like property; empty when it has none. */
  states: readonly string[]
  /** A plain frame acting as a control: it cannot inherit states from the design system. */
  detached: boolean
  box: Rect
}

export interface CollectedHeading { nodeId: string; text: string; level: 1 | 2 | 3; box: Rect }

export type LandmarkRole = 'banner' | 'navigation' | 'main' | 'complementary' | 'contentinfo' | 'search'

export interface CollectedLandmark { nodeId: string; name: string; role: LandmarkRole; box: Rect }

export interface SpecInput {
  rootId: string
  rootName: string
  rootSize: { width: number; height: number }
  controls: readonly CollectedControl[]
  headings: readonly CollectedHeading[]
  landmarks: readonly CollectedLandmark[]
  /** Layers with an image fill: each needs alt text or a decorative mark. */
  images: number
}

export interface SpecAudit {
  standard?: StandardId
  platform: Platform
  /** Findings still open in the latest scan; null when no scan has run. */
  openIssues: number | null
}

export interface SpecRow {
  order: number
  nodeId: string
  name: string
  component: string
  role: string
  aria: string
  accessibleName: string
  /** True when only the designer can supply the name. */
  needsName: boolean
  states: string
  /** True when the component has no focus state to build from. */
  missingFocus: boolean
  keyboard: string
  box: Rect
}

export interface Dependency { item: string; status: Badge; detail: string; owner: string }

export interface SpecDoc {
  kind: 'spec'
  title: string
  intro: string
  details: readonly DocDetail[]
  dependencies: readonly Dependency[]
  rows: readonly SpecRow[]
  headings: readonly CollectedHeading[]
  landmarks: readonly CollectedLandmark[]
  notes: readonly ImplementationNote[]
  done: readonly string[]
  rootId: string
  rootSize: { width: number; height: number }
  footer: string
}

/** Rows within this many px of each other read as one line. */
const ROW_TOLERANCE = 8

/** Reading order: top to bottom, left to right within a line. This is the default focus order. */
export function readingOrder<T extends { box: Rect }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => (Math.abs(a.box.y - b.box.y) <= ROW_TOLERANCE ? a.box.x - b.box.x : a.box.y - b.box.y))
}

const FOCUS = /focus/i
const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`
const list = (names: readonly string[], max = 3): string => (names.length > max ? `${names.slice(0, max).join(', ')} and ${names.length - max} more` : names.join(', '))

function accessibleName(c: CollectedControl): { name: string; needs: boolean } {
  const label = humanName(c.name)
  if (c.text) {
    if (c.role === 'combobox' && label && label.toLowerCase() !== c.text.toLowerCase()) return { name: `“${label}: ${c.text}”`, needs: false }
    return { name: `“${c.text}” (visible label)`, needs: false }
  }
  return { name: label ? `Suggested: “${label}”` : 'Needs a name', needs: true }
}

function rowFor(c: CollectedControl, order: number): SpecRow {
  const info = ROLE_INFO[c.role]
  const hasFocus = c.states.some((s) => FOCUS.test(s))
  const { name, needs } = accessibleName(c)
  const states = c.states.length ? c.states.join(', ') : info.states.join(', ')
  return {
    order,
    nodeId: c.nodeId,
    name: humanName(c.name) ?? (c.text || c.component || c.name),
    component: c.detached ? 'plain frame, not a component' : (c.component ?? c.name),
    role: info.role,
    aria: info.aria,
    accessibleName: name,
    needsName: needs,
    states: !c.detached && c.states.length && !hasFocus ? `${states} · add Focus` : states,
    missingFocus: c.detached || (c.states.length > 0 && !hasFocus),
    keyboard: info.keyboard,
    box: c.box,
  }
}

function dependencies(input: SpecInput, rows: readonly SpecRow[], audit: SpecAudit): Dependency[] {
  const label = standardLabel(audit.standard)
  const open = audit.openIssues
  const noFocus = rows.filter((r) => r.missingFocus)
  const unnamed = rows.filter((r) => r.needsName)
  const detached = input.controls.filter((c) => c.detached)
  return [
    open === null
      ? { item: 'Audit issues fixed and re-scanned', status: { tone: 'serious', label: 'Not scanned' }, detail: 'Run the accessibility scan on this screen before handing it over.', owner: 'Design' }
      : open === 0
        ? { item: 'Audit issues fixed and re-scanned', status: { tone: 'pass', label: 'Done' }, detail: `The latest scan found no issues against ${label} AA.`, owner: 'Design' }
        : { item: 'Audit issues fixed and re-scanned', status: { tone: 'critical', label: `${open} open` }, detail: `${plural(open, 'issue is', 'issues are')} still open. Fix and scan again before handing over.`, owner: 'Design' },
    noFocus.length
      ? { item: 'Focus state on every interactive component', status: { tone: 'serious', label: `${noFocus.length} missing` }, detail: `No focus state to build from: ${list(noFocus.map((r) => r.name))}.`, owner: 'Design system' }
      : { item: 'Focus state on every interactive component', status: { tone: 'pass', label: 'Done' }, detail: rows.length ? 'Every control comes from a component with a focus state.' : 'No interactive layers found.', owner: 'Design system' },
    unnamed.length
      ? { item: 'Names for icon-only controls', status: { tone: 'serious', label: 'Needs design input' }, detail: `${plural(unnamed.length, 'control')} without visible text: ${list(unnamed.map((r) => `${r.order}. ${r.name}`))}. Confirm the suggested names.`, owner: 'Design' }
      : { item: 'Names for icon-only controls', status: { tone: 'pass', label: 'Done' }, detail: 'Every control has visible text that names it.', owner: 'Design' },
    input.images
      ? { item: 'Images: alt text or decorative', status: { tone: 'minor', label: 'Check by hand' }, detail: `${plural(input.images, 'layer')} with an image fill. Write alt text, or mark it decorative.`, owner: 'Design' }
      : { item: 'Images: alt text or decorative', status: { tone: 'pass', label: 'No images' }, detail: 'No image fills in this screen.', owner: 'Design' },
    detached.length
      ? { item: 'Controls come from the design system', status: { tone: 'moderate', label: plural(detached.length, 'plain frame') }, detail: `${list(detached.map((c) => c.name))} ${detached.length === 1 ? 'is' : 'are'} drawn by hand, so ${detached.length === 1 ? 'it gets' : 'they get'} no states from the library.`, owner: 'Design system' }
      : { item: 'Controls come from the design system', status: { tone: 'pass', label: 'Done' }, detail: 'Every control is a component instance.', owner: 'Design system' },
    { item: 'Status messages marked', status: { tone: 'minor', label: 'Check by hand' }, detail: 'Mark any text that changes on its own (progress, results, errors) so it is announced.', owner: 'Design' },
  ]
}

function doneWhen(rows: readonly SpecRow[], input: SpecInput): string[] {
  const roles = new Set(rows.map((r) => r.role))
  const items = [
    rows.length ? `Tab reaches 1 to ${rows.length} in order, with nothing skipped or trapped.` : 'Tab reaches every control in reading order.',
    'Every stop shows the focus ring.',
    'A screen reader reads each name in the Components table.',
  ]
  if (roles.has(ROLE_INFO.combobox.role) || roles.has(ROLE_INFO.menubutton.role)) items.push('Esc closes every menu and returns focus to the control that opened it.')
  if (input.headings.length) items.push(`The screen reader lists headings H1 to H${Math.max(...input.headings.map((h) => h.level))} in order.`)
  if (input.landmarks.length) items.push(`The screen reader lists the ${plural(input.landmarks.length, 'landmark')}: ${input.landmarks.map((l) => l.role).join(', ')}.`)
  items.push('A Bluebird re-scan of the built screen finds no issues.')
  return items
}

export function buildSpecDoc(input: SpecInput, audit: SpecAudit, createdOn: string): SpecDoc {
  const ordered = readingOrder(input.controls)
  const rows = ordered.map((c, i) => rowFor(c, i + 1))
  const label = standardLabel(audit.standard)
  const components = new Set(input.controls.filter((c) => !c.detached && c.component).map((c) => c.component))
  return {
    kind: 'spec',
    title: input.rootName,
    intro: 'How to build this screen so it works with a keyboard and a screen reader. Numbers on the screen match the rows in the Components table.',
    details: [
      { key: 'Standard', value: `${label} · Level AA` },
      { key: 'Platform', value: `${PLATFORM_TARGETS[audit.platform].label}${audit.platform === 'web' ? ' (ARIA roles below)' : ''}` },
      { key: 'Audit', value: audit.openIssues === null ? 'Not scanned yet' : audit.openIssues === 0 ? `No open issues · scanned ${createdOn}` : `${plural(audit.openIssues, 'issue')} still open` },
      { key: 'Components', value: `${plural(rows.length, 'control')} annotated · ${plural(components.size, 'component')}` },
    ],
    dependencies: dependencies(input, rows, audit),
    rows,
    headings: input.headings,
    landmarks: input.landmarks,
    notes: notesFor(new Set(input.controls.map((c) => c.role)), rows.some((r) => r.needsName), audit.platform),
    done: doneWhen(rows, input),
    rootId: input.rootId,
    rootSize: input.rootSize,
    footer: `Generated by Bluebird from the audited design on ${createdOn}. Rows can be sent to Jira from the developer handoff. Names marked “Needs design input” must be confirmed before this ships.`,
  }
}
