import { useEffect, useRef, useState } from 'preact/hooks'
import { Button, EmptyState, FilterDropdown, LinkButton, Notice, ProgressBar, useRpc } from '@shared/ui'
import { plural, type Filter } from '../format'
import {
  MSG,
  type AuditProgress, type AuditResult, type GotoResult, type PagesResult, type Place, type SelectResult,
} from '../messages'
import {
  currentPage, details, error, expanded, filter, libraries, pages, progress, result, scope, screen, selected, source, status, toast, view, type Toast,
} from '../state'
import { Ready } from './Ready'
import { ScopeFilter } from './ScopeFilter'
import { ScopeResults } from './ScopeResults'
import { ViewMenu } from './ViewMenu'
import './audit.css'

const TOAST_MS = 4000
const RUN_TIMEOUT_MS = 300_000
const PAGES_TIMEOUT_MS = 90_000

const message = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback)

/**
 * Audit tab — Figma "Audit · 600 · v2" (page "Audit"). One run says how much of a selection,
 * a page or several pages is mapped to the Dual File libraries, by screen, and what is not.
 * Across files is Library Analytics, which only reports per library; it is not offered yet.
 */
export function Tab() {
  const rpc = useRpc()
  /** Bumped per run and on unmount: only the newest answer may write to the tab's state. */
  const latest = useRef(0)
  const [scopeOpen, setScopeOpen] = useState(false)

  useEffect(() => {
    const offProgress = rpc.on<AuditProgress>(MSG.progress, (p) => { progress.value = p })
    const offSelection = rpc.on<{ count: number }>('shell:selection', (s) => { selected.value = s.count })
    const mine = latest.current
    rpc.call<PagesResult>(MSG.pages, undefined, PAGES_TIMEOUT_MS).then((r) => {
      if (mine !== latest.current) return
      pages.value = r.pages
      selected.value = r.selected
      source.value = r.source
      currentPage.value = { name: r.currentPage, screens: r.screens }
      libraries.value = r.libraries
    }).catch(() => undefined)
    // The result stays: "Fix these in Variable mapper" leaves this tab and comes back to it.
    return () => {
      latest.current += 1
      offProgress()
      offSelection()
      if (status.value === 'running') status.value = result.value ? 'done' : 'idle'
    }
  }, [rpc])

  useEffect(() => {
    if (!toast.value) return
    const id = setTimeout(() => { toast.value = null }, TOAST_MS)
    return () => clearTimeout(id)
  }, [toast.value])

  const notify = (t: Toast) => { toast.value = t }
  const fail = (e: unknown) => notify({ tone: 'error', title: 'That didn’t work', body: message(e, 'Figma did not answer.') })

  async function run() {
    const mine = (latest.current += 1)
    status.value = 'running'
    progress.value = null
    error.value = null
    view.value = 'scope'
    try {
      const r = await rpc.call<AuditResult>(MSG.run, scope.value, RUN_TIMEOUT_MS)
      if (mine !== latest.current) return
      result.value = r
      expanded.value = new Set()
      filter.value = 'overview'
      screen.value = null
      status.value = 'done'
    } catch (e: unknown) {
      if (mine !== latest.current) return
      error.value = message(e, 'The audit didn’t finish.')
      status.value = 'error'
    }
  }

  /** Opening a screen lands on its list; leaving it returns to the overview. */
  function openScreen(id: string | null) {
    screen.value = id
    filter.value = id ? 'not-mapped' : 'overview'
    expanded.value = new Set()
  }

  async function select(nodeIds: readonly string[], label: string) {
    try {
      const r = await rpc.call<SelectResult>(MSG.select, { nodeIds })
      notify({
        tone: 'info', title: `Selected ${plural(r.selected, 'layer')} in ${label}`,
        body: r.elsewhere ? `${r.elsewhere} more on other pages. Use a row below to open them.` : `They’re highlighted in the Layers panel on ${r.page}.`,
      })
    } catch (e: unknown) { fail(e) }
  }

  async function goTo(place: Place) {
    try {
      const r = await rpc.call<GotoResult>(MSG.goto, { nodeId: place.nodeIds[0]! })
      notify({ tone: 'info', title: `Opened ${place.name} on ${r.page}`, body: `Figma zoomed to the first instance, ${r.name}.` })
    } catch (e: unknown) { fail(e) }
  }

  const running = status.value === 'running'
  const r = result.value
  const ready = status.value === 'done' && r?.status === 'ready' ? r : null
  const empty = !!ready && ready.score.total === 0 && ready.counts.spacing === 0
  const files = view.value === 'files'
  const p = progress.value
  const bar = p ? Math.round(((p.index - 0.5) / p.total) * 100) : 0

  return (
    <div class="bb-audit">
      <div class="bb-audit__toolbar" role="toolbar" aria-label="Audit">
        <ScopeFilter pages={pages.value} selected={selected.value} scope={scope.value} open={scopeOpen} onOpenChange={setScopeOpen} disabled={running} onChange={(s) => { scope.value = s }} />
        <FilterDropdown class="bb-audit__source" disabled title="Components come from Settings › Dual File Mode">{source.value ?? 'No library'}</FilterDropdown>
        <ViewMenu view={view.value} onChange={(v) => { view.value = v }} />
        <span class="bb-audit__spacer" />
        <Button leadingIcon="ui-sidebar-search" loading={running} onClick={() => { void run() }}>Run audit</Button>
      </div>

      <div class="bb-audit__content">
        {files && (
          <Notice tone="info" title="Across files is coming soon">
            A high-level view of how your libraries are used across the organisation: teams, files, detaches and what is never used. This scope works today.
          </Notice>
        )}

        {!files && status.value === 'idle' && (
          <Ready libraries={libraries.value} scope={scope.value} selected={selected.value} page={currentPage.value} pageCount={pages.value.length}
            onScope={(s) => { scope.value = s }} onChoosePages={() => setScopeOpen(true)} onRun={() => { void run() }} />
        )}

        {!files && running && (
          <div class="bb-audit__progress" role="status">
            <span class="bb-audit__title">{p ? `Auditing ${p.page}` : 'Reading your library…'}</span>
            <ProgressBar value={bar} tone="success" />
            {p && <span class="bb-audit__status">{`Matching instances and values to your libraries · ${plural(p.visited, 'layer')}`}</span>}
          </div>
        )}

        {!files && status.value === 'error' && (
          <Notice tone="error" title="The audit didn’t finish">{error.value} <LinkButton onClick={() => { void run() }}>Try again</LinkButton></Notice>
        )}
        {!files && status.value === 'done' && r?.status === 'nothing-selected' && (
          <EmptyState class="bb-audit__empty" title="Select some layers first" description="Your selection changed since you chose this scope." hint="Pick layers on the canvas, or choose Current page." />
        )}

        {!files && ready && empty && (
          <EmptyState class="bb-audit__empty" title="Nothing to audit" description={`${ready.scope} has no layers to check.`} hint="Pick another page, or select layers first." />
        )}

        {!files && ready && !empty && (
          <ScopeResults result={ready} filter={filter.value} screenId={screen.value} details={details.value} expanded={expanded.value}
            onFilter={(f: Filter) => { filter.value = f }} onScreen={openScreen} onDetails={(open) => { details.value = open }}
            onExpanded={(ids) => { expanded.value = ids }}
            onSelect={(ids, label) => { void select(ids, label) }} onGoTo={(place) => { void goTo(place) }} />
        )}
      </div>

      {toast.value && <Notice class="bb-audit__toast" tone={toast.value.tone} title={toast.value.title} aria-live="polite">{toast.value.body}</Notice>}
    </div>
  )
}
