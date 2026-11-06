import { useEffect, useRef } from 'preact/hooks'
import { Button, EmptyState, FilterDropdown, LinkButton, Notice, ProgressBar, SearchBar, SectionTitle, SegmentedControl, useRpc } from '@shared/ui'
import { requestTab } from '@shared/navigation'
import { filterOptions, isValue, visibleItems, type Filter } from '../format'
import {
  MSG,
  type AnalyticsResult, type Asset, type AuditItem, type AuditProgress, type AuditResult, type GotoResult, type PagesResult, type Place, type SelectResult,
} from '../messages'
import {
  analytics, asset, details, error, expanded, filter, pages, progress, query, result, scope, selected, source, status, toast, view, type Toast, type View,
} from '../state'
import { AcrossFiles } from './AcrossFiles'
import { ItemCard } from './Results'
import { ScopeFilter } from './ScopeFilter'
import { Summary } from './Summary'
import './audit.css'

const TOAST_MS = 4000
const RUN_TIMEOUT_MS = 300_000
const ANALYTICS_TIMEOUT_MS = 90_000

const COUNTED = [
  ['Variables', [
    ['Colours', 'Paints that don’t read a variable, with the variable that already holds the value'],
    ['Spacing', 'Auto-layout gaps and padding that aren’t on your spacing scale'],
  ]],
  ['Components', [
    ['From library', 'Instances whose main component is in your Dual File library'],
    ['Detached', 'Frames that were detached from a component'],
    ['Not in library', 'Local components and instances from other libraries'],
    ['Unused', 'Library components with no instance in this scope'],
  ]],
] as const

const VIEWS: readonly { value: View; label: string }[] = [{ value: 'scope', label: 'This scope' }, { value: 'files', label: 'Across files' }]

const message = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback)
const plural = (n: number, one: string) => `${n.toLocaleString()} ${one}${n === 1 ? '' : 's'}`

/**
 * Audit tab — Figma "Audit · 600" (page "Audit"). One run checks variables and components.
 * This scope is a scan of the document; Across files is Library Analytics, which
 * only reports per library and can't see a page or a selection.
 */
export function Tab() {
  const rpc = useRpc()
  /** Bumped per run and on unmount: only the newest answer may write to the tab's state. */
  const latest = useRef(0)

  useEffect(() => {
    const offProgress = rpc.on<AuditProgress>(MSG.progress, (p) => { progress.value = p })
    const offSelection = rpc.on<{ count: number }>('shell:selection', (s) => { selected.value = s.count })
    const mine = latest.current
    rpc.call<PagesResult>(MSG.pages, undefined, ANALYTICS_TIMEOUT_MS).then((r) => {
      if (mine !== latest.current) return
      pages.value = r.pages
      selected.value = r.selected
      source.value = r.source
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
    analytics.value = {}
    try {
      const r = await rpc.call<AuditResult>(MSG.run, scope.value, RUN_TIMEOUT_MS)
      if (mine !== latest.current) return
      result.value = r
      expanded.value = new Set()
      filter.value = 'all'
      status.value = 'done'
    } catch (e: unknown) {
      if (mine !== latest.current) return
      error.value = message(e, 'The audit didn’t finish.')
      status.value = 'error'
    }
  }

  async function loadAsset(next: Asset) {
    asset.value = next
    const current = analytics.value[next]
    if (current && current.status !== 'error') return
    const mine = latest.current
    analytics.value = { ...analytics.value, [next]: { status: 'loading' } }
    try {
      const r = await rpc.call<AnalyticsResult>(MSG.analytics, { asset: next }, ANALYTICS_TIMEOUT_MS)
      if (mine === latest.current) analytics.value = { ...analytics.value, [next]: r }
    } catch (e: unknown) {
      if (mine === latest.current) analytics.value = { ...analytics.value, [next]: { status: 'error', message: message(e, 'Try again in a moment.') } }
    }
  }

  function openView(next: View) {
    view.value = next
    if (next === 'files') void loadAsset(asset.value)
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
  const items = ready ? visibleItems(ready.items, filter.value, query.value) : []
  const unused = ready && filter.value === 'unused' ? ready.unused.filter((u) => u.name.toLowerCase().includes(query.value.trim().toLowerCase())) : []
  const empty = !!ready && ready.score.total === 0 && ready.counts.spacing === 0
  const card = (item: AuditItem) => (
    <ItemCard key={item.id} item={item} expanded={expanded.value.has(item.id)}
      onToggle={(open) => {
        const next = new Set(expanded.value)
        if (open) next.add(item.id); else next.delete(item.id)
        expanded.value = next
      }}
      onSelect={(ids, label) => { void select(ids, label) }} onGoTo={(place) => { void goTo(place) }} />
  )
  const heading = (title: string) => <SectionTitle class="bb-audit__heading" title={title} showCount={false} showAction={false} />
  const values = items.filter(isValue)
  const parts = items.filter((i) => !isValue(i))
  const p = progress.value
  const bar = p ? Math.round(((p.index - 0.5) / p.total) * 100) : 0

  return (
    <div class="bb-audit">
      <div class="bb-audit__toolbar" role="toolbar" aria-label="Audit">
        <ScopeFilter pages={pages.value} selected={selected.value} scope={scope.value} disabled={running} onChange={(s) => { scope.value = s }} />
        <FilterDropdown class="bb-audit__source" disabled title="Components come from Settings › Dual File Mode">{source.value ?? 'No library'}</FilterDropdown>
        <SearchBar class="bb-audit__search" value={query.value} label="Filter results" placeholder="Filter results" disabled={!ready} onValueChange={(v) => { query.value = v }} />
        <Button leadingIcon="ui-sidebar-search" loading={running} onClick={() => { void run() }}>Run audit</Button>
      </div>

      <div class="bb-audit__content">
        {status.value === 'idle' && (
          <>
            {COUNTED.map(([group, rows]) => (
              <section key={group} class="bb-audit__counted-group" aria-label={group}>
                {heading(group)}
                <dl class="bb-audit__counted">
                  {rows.map(([name, text]) => <div key={name}><dt>{name}</dt><dd>{text}</dd></div>)}
                </dl>
              </section>
            ))}
          </>
        )}

        {running && (
          <div class="bb-audit__progress" role="status">
            <span class="bb-audit__title">{p ? `Auditing ${p.page}` : 'Reading your library…'}</span>
            <ProgressBar value={bar} tone="success" />
            {p && <span class="bb-audit__status">{`Checking variables and components · ${p.visited.toLocaleString()} layers`}</span>}
          </div>
        )}

        {status.value === 'error' && (
          <Notice tone="error" title="The audit didn’t finish">{error.value} <LinkButton onClick={() => { void run() }}>Try again</LinkButton></Notice>
        )}
        {status.value === 'done' && r?.status === 'nothing-selected' && (
          <EmptyState class="bb-audit__empty" title="Select some layers first" description="Your selection changed since you chose this scope." hint="Pick layers on the canvas, or choose Current page." />
        )}

        {ready && <SegmentedControl class="bb-audit__segments" aria-label="View" options={VIEWS} value={view.value} onChange={openView} />}

        {ready && view.value === 'files' && <AcrossFiles asset={asset.value} state={analytics.value[asset.value] ?? { status: 'idle' }} onAsset={(a) => { void loadAsset(a) }} />}

        {ready && view.value === 'scope' && empty && (
          <EmptyState class="bb-audit__empty" title="Nothing to audit" description={`${ready.scope} has no layers to check.`} hint="Pick another page, or select layers first." />
        )}

        {ready && view.value === 'scope' && !empty && (
          <>
            <Summary result={ready} details={details.value} onDetails={(open) => { details.value = open }} />
            {ready.problem && <EmptyState class="bb-audit__block" title="Components need a library" description="Variables are checked. Add a Components file to audit components too." hint={ready.problem} />}
            {ready.issues === 0 && <EmptyState class="bb-audit__empty" title="Nothing to fix" description="Everything in this scope comes from the design system." />}
            {ready.issues > 0 && (
              <>
                <SegmentedControl class="bb-audit__segments" aria-label="Issues" options={filterOptions(ready.counts, ready.issues, !!ready.source)} value={filter.value} onChange={(v: Filter) => { filter.value = v }} />
                {(filter.value === 'colours' || filter.value === 'spacing') && items.length > 0 && (
                  <div class="bb-audit__actions"><LinkButton onClick={() => requestTab('varmapper')}>Fix these in Variable mapper</LinkButton></div>
                )}
                {filter.value === 'all' && values.length > 0 && parts.length > 0 ? (
                  <>
                    {heading('Variables')}
                    {values.map(card)}
                    {heading('Components')}
                    {parts.map(card)}
                  </>
                ) : items.map(card)}
                {unused.map((u) => <p key={u.key} class="bb-audit__unused" title={u.location}>{u.name}</p>)}
                {!items.length && !unused.length && <p class="bb-audit__status">Nothing here.</p>}
              </>
            )}
          </>
        )}
      </div>

      {toast.value && <Notice class="bb-audit__toast" tone={toast.value.tone} title={toast.value.title} aria-live="polite">{toast.value.body}</Notice>}
    </div>
  )
}
