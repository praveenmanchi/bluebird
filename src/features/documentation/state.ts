// Tab-local state. Nothing outside src/features/documentation reads or writes this.
import { computed, signal } from '@preact/signals'
import type { SelectionResult } from './messages'
import {
  AUDIENCES, DRAFT_VERSIONS, INCLUDES, SECTIONS,
  type AuditResult, type ComponentDoc, type DocMode, type FindingCategory, type HandoffResult, type IncludeId, type PageInfo, type ProgressStep, type SectionId, type Ticket,
} from './types'

export const mode = signal<DocMode>('components')
/** Steps streamed by whichever of generate / hand-off is running. */
export const progress = signal<readonly ProgressStep[]>([])

// ── Components ────────────────────────────────────────────────────────────────

/** configure: nothing generated for the selection (or "Generate again" pressed). */
export type ComponentPhase = 'loading' | 'configure' | 'generating' | 'result' | 'failed'

export const componentPhase = signal<ComponentPhase>('loading')
/** null until documentation:selection answers. */
export const selection = signal<SelectionResult | null>(null)
export const sections = signal<ReadonlySet<SectionId>>(new Set(SECTIONS.map(([id]) => id)))
export const drawFrame = signal(true)
export const doc = signal<ComponentDoc | null>(null)
/** What changed on the component since `doc`; empty = up to date. */
export const changes = signal<readonly string[]>([])
export const componentError = signal<string | null>(null)
/** Feedback under the result's actions: "Markdown copied". */
export const notice = signal<string | null>(null)

export const component = computed(() => selection.value?.status === 'component' ? selection.value.component : null)

export function loadSelection(next: SelectionResult): void {
  selection.value = next
  componentError.value = null
  notice.value = null
  if (next.status === 'component' && next.doc) {
    doc.value = next.doc
    changes.value = next.changes
    componentPhase.value = 'result'
  } else {
    doc.value = null
    changes.value = []
    componentPhase.value = 'configure'
  }
}

export function toggleSection(id: SectionId, on: boolean): void {
  const next = new Set(sections.value)
  if (on) next.add(id)
  else next.delete(id)
  sections.value = next
}

// ── Hand-off ──────────────────────────────────────────────────────────────────

export type HandoffPhase = 'loading' | 'pages' | 'auditing' | 'audit' | 'review' | 'no-prototype' | 'details' | 'building' | 'result' | 'failed'

export const handoffPhase = signal<HandoffPhase>('loading')
export const pages = signal<readonly PageInfo[]>([])
export const picked = signal<ReadonlySet<string>>(new Set())
export const audit = signal<AuditResult | null>(null)
export const ignored = signal<ReadonlySet<string>>(new Set())
export const reviewFilter = signal<FindingCategory | 'all'>('all')
/** null = not asked yet; a string = why Jira could not list tickets. */
export const tickets = signal<readonly Ticket[] | string | null>(null)
export const ticket = signal<Ticket | null>(null)
export const intent = signal('')
export const audience = signal<string>(AUDIENCES[0])
export const version = signal<string>(DRAFT_VERSIONS[0])
export const include = signal<ReadonlySet<IncludeId>>(new Set(INCLUDES.map(([id]) => id)))
export const handoff = signal<HandoffResult | null>(null)
export const handoffError = signal<string | null>(null)
/** idle → posting → posted | the reason it failed. */
export const postState = signal<'idle' | 'posting' | 'posted' | { error: string }>('idle')

export const pickedPages = computed(() => pages.value.filter((p) => picked.value.has(p.id)))
/** Findings still open: not ignored. */
export const openFindings = computed(() => (audit.value?.findings ?? []).filter((f) => !ignored.value.has(f.id)))

export function togglePage(id: string, on: boolean): void {
  const next = new Set(picked.value)
  if (on) next.add(id)
  else next.delete(id)
  picked.value = next
}

export function setIgnored(ids: readonly string[], on: boolean): void {
  const next = new Set(ignored.value)
  for (const id of ids) { if (on) next.add(id); else next.delete(id) }
  ignored.value = next
}

export function toggleInclude(id: IncludeId, on: boolean): void {
  const next = new Set(include.value)
  if (on) next.add(id)
  else next.delete(id)
  include.value = next
}

/** Back to "Select pages", keeping the page list. */
export function restartHandoff(): void {
  audit.value = null
  ignored.value = new Set()
  reviewFilter.value = 'all'
  handoff.value = null
  handoffError.value = null
  postState.value = 'idle'
  handoffPhase.value = 'pages'
}

export function reset(): void {
  mode.value = 'components'
  progress.value = []
  componentPhase.value = 'loading'
  selection.value = null
  sections.value = new Set(SECTIONS.map(([id]) => id))
  drawFrame.value = true
  doc.value = null
  changes.value = []
  componentError.value = null
  notice.value = null
  pages.value = []
  picked.value = new Set()
  tickets.value = null
  ticket.value = null
  intent.value = ''
  audience.value = AUDIENCES[0]
  version.value = DRAFT_VERSIONS[0]
  include.value = new Set(INCLUDES.map(([id]) => id))
  restartHandoff()
  handoffPhase.value = 'loading'
}
