import { useEffect, useRef } from 'preact/hooks'
import { Button, EmptyState, FilterDropdown, KpiTile, LinkButton, Notice, ProgressBar, SearchBar, SegmentedControl, useRpc } from '@shared/ui'
import { filterOptions, kindOf, matchCounts, valuesLeft, visibleGroups } from '../format'
import {
  MSG,
  type BindResult, type Candidate, type CheckProgress, type CheckResult, type GotoResult, type LayerRef, type MapperGroup, type SelectResult, type UndoResult,
} from '../messages'
import { bound, clearChoices, error, expanded, filter, picks, query, reset, restored, result, status, ticked, toast, visited, type Filter, type Toast } from '../state'
import { MapperRow } from './MapperRow'
import './variable-mapper.css'

const TOAST_MS = 4000
/** Selecting layers from the tab fires Figma's selection event; that must not re-run the check. */
const OWN_SELECTION_MS = 1000
const SELECTION_DEBOUNCE_MS = 250
const CHECK_TIMEOUT_MS = 120_000
/** A big group is thousands of layers, written one at a time. */
const WRITE_TIMEOUT_MS = 120_000

const message = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback)
const plural = (n: number, one: string) => `${n.toLocaleString()} ${one}${n === 1 ? '' : 's'}`
const withEntry = <K, V>(map: ReadonlyMap<K, V>, key: K, value: V) => new Map(map).set(key, value)
const toggled = <T,>(set: ReadonlySet<T>, item: T, on: boolean) => {
  const next = new Set(set)
  if (on) next.add(item); else next.delete(item)
  return next
}

/** The variable a group will bind: the designer's pick, else a recommendation worth making. */
function variableOf(g: MapperGroup): Candidate | undefined {
  return picks.value.get(g.id) ?? (g.match === 'none' ? undefined : g.candidates[0])
}

/**
 * Variable mapper tab — Figma "Variable mapper · 600" (page "Variable Mapper").
 * Follows the selection: every hard-coded value inside it, grouped by property
 * and value, with the variable to use from the Dual File source.
 */
export function Tab() {
  const rpc = useRpc()
  const quietUntil = useRef(0)
  /** Bumped per check and on unmount: only the newest check may write, so Bind never acts on an older selection. */
  const latest = useRef(0)

  async function run() {
    const mine = (latest.current += 1)
    status.value = 'checking'
    visited.value = 0
    error.value = null
    try {
      const r = await rpc.call<CheckResult>(MSG.check, undefined, CHECK_TIMEOUT_MS)
      if (mine !== latest.current) return
      clearChoices()
      result.value = r
      status.value = 'done'
    } catch (e: unknown) {
      if (mine !== latest.current) return
      error.value = message(e, 'The check didn’t finish.')
      status.value = 'error'
    }
  }

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const offProgress = rpc.on<CheckProgress>(MSG.progress, (p) => { visited.value = p.visited })
    const offSelection = rpc.on('shell:selection', () => {
      if (Date.now() < quietUntil.current) return
      clearTimeout(timer)
      timer = setTimeout(() => { void run() }, SELECTION_DEBOUNCE_MS)
    })
    void run()
    return () => { latest.current += 1; clearTimeout(timer); offProgress(); offSelection(); reset() }
  }, [rpc])

  useEffect(() => {
    if (!toast.value) return
    const id = setTimeout(() => { toast.value = null }, TOAST_MS)
    return () => clearTimeout(id)
  }, [toast.value])

  const notify = (t: Toast) => { toast.value = t }
  const fail = (e: unknown) => notify({ tone: 'error', title: 'That didn’t work', body: message(e, 'Figma did not answer.') })

  /**
   * Binds each group to its variable; one message for the lot. A group that fails doesn't stop
   * the rest. A newer check owns the list, so this one stops writing to it.
   */
  async function bindGroups(groups: readonly MapperGroup[]) {
    const mine = latest.current
    const totals = { values: 0, skipped: 0, stuck: 0, restoredLayers: 0, failed: 0 }
    let failure: unknown
    const used = new Set<string>()
    for (const g of groups) {
      const variable = variableOf(g)
      if (!variable) continue
      try {
        const r = await rpc.call<BindResult>(MSG.bind, {
          variableKey: variable.key, targets: g.targets, value: g.value, keepValue: variable.exact, ...(g.opacity !== undefined ? { opacity: g.opacity } : {}),
        }, WRITE_TIMEOUT_MS)
        if (mine !== latest.current) return
        totals.values += r.bound
        totals.skipped += r.skipped
        totals.stuck += r.stuck
        totals.restoredLayers += r.restoredLayers
        ticked.value = toggled(ticked.value, g.id, false)
        if (!r.bound) continue
        used.add(variable.key)
        bound.value = withEntry(bound.value, g.id, { variable, undoId: r.undoId, values: r.bound, restoredLayers: r.restoredLayers })
      } catch (e: unknown) {
        if (mine !== latest.current) return
        totals.failed += 1
        failure = e
      }
    }
    restored.value = totals.restoredLayers ? { layers: totals.restoredLayers, values: totals.values } : null
    report(totals, used.size, failure)
  }

  function report({ values, skipped, stuck, restoredLayers, failed }: { values: number; skipped: number; stuck: number; restoredLayers: number; failed: number }, variables: number, failure: unknown) {
    if (failed && !values && !restoredLayers) { fail(failure); return }
    if (stuck) { notify({ tone: 'error', title: `${plural(stuck, 'value')} changed and couldn’t be put back`, body: 'Use Undo on the row, or Cmd+Z in Figma.' }); return }
    if (restoredLayers && !failed) return
    const title = `Bound ${plural(values, 'value')} to ${plural(variables, 'variable')}`
    if (failed) notify({ tone: 'error', title, body: `${plural(failed, 'group')} couldn’t be bound: ${message(failure, 'Figma did not answer.')}` })
    else if (skipped) notify({ tone: 'info', title, body: `${plural(skipped, 'value')} changed since the check and ${skipped === 1 ? 'was' : 'were'} left alone. Re-check to see them.` })
    else notify({ tone: 'info', title, body: 'Undo with Cmd+Z in Figma, or Undo on a row.' })
  }

  async function undo(g: MapperGroup) {
    const entry = bound.value.get(g.id)
    if (!entry) return
    try {
      const r = await rpc.call<UndoResult>(MSG.undo, { undoId: entry.undoId }, WRITE_TIMEOUT_MS)
      const next = new Map(bound.value)
      next.delete(g.id)
      bound.value = next
      restored.value = null
      if (r.skipped) notify({ tone: 'info', title: `Restored ${plural(r.restored, 'value')}`, body: `${plural(r.skipped, 'value')} changed after Bind and ${r.skipped === 1 ? 'was' : 'were'} left alone. Re-check to see where things stand.` })
    } catch (e: unknown) { fail(e) }
  }

  async function select(nodeIds: readonly string[], label: string) {
    quietUntil.current = Date.now() + OWN_SELECTION_MS
    try {
      const r = await rpc.call<SelectResult>(MSG.select, { nodeIds })
      notify({ tone: 'info', title: `Selected ${plural(r.selected, 'layer')}`, body: `${label}, on ${r.page}. This list stays until you Re-check.` })
    } catch (e: unknown) { fail(e) }
  }

  async function goTo(layer: LayerRef) {
    quietUntil.current = Date.now() + OWN_SELECTION_MS
    try {
      const r = await rpc.call<GotoResult>(MSG.goto, { nodeId: layer.id })
      notify({ tone: 'info', title: `Opened ${r.name}`, body: `Figma zoomed to it on ${r.page}.` })
    } catch (e: unknown) { fail(e) }
  }

  const r = result.value
  const checking = status.value === 'checking'
  const ready = r?.status === 'ready' ? r : null
  const source = r && (r.status === 'ready' || r.status === 'no-selection') ? r.source.name : r?.status === 'no-source' ? 'No source' : 'Source'
  const open = ready?.groups.filter((g) => valuesLeft(g, bound.value) > 0) ?? []
  const counts = matchCounts(open, picks.value, bound.value)
  const rows = ready ? visibleGroups(ready.groups, filter.value, query.value) : []
  const chosen = ready?.groups.filter((g) => ticked.value.has(g.id) && kindOf(g, picks.value) === 'exact') ?? []
  const exact = rows.filter((g) => kindOf(g, picks.value) === 'exact' && !bound.value.has(g.id))
  const showMode = new Set(ready?.groups.map((g) => g.mode)).size > 1
  const put = restored.value

  return (
    <div class="bb-varmapper">
      <div class="bb-varmapper__toolbar" role="toolbar" aria-label="Variable mapper">
        <FilterDropdown class="bb-varmapper__source" disabled title="Variables come from Settings › Dual File Mode">{source}</FilterDropdown>
        <SearchBar class="bb-varmapper__search" value={query.value} label="Filter by layer or value" placeholder="Filter by layer or value" disabled={!ready} onValueChange={(v) => { query.value = v }} />
        <Button leadingIcon="ui-sidebar-search" loading={checking} onClick={() => { void run() }}>Re-check</Button>
      </div>

      <div class="bb-varmapper__content">
        {checking && (
          <div class="bb-varmapper__status" role="status">
            <ProgressBar value={50} tone="success" />
            <span>{visited.value ? `Checking ${visited.value.toLocaleString()} layers…` : 'Reading your variables and the selection…'}</span>
          </div>
        )}

        {!checking && status.value === 'error' && (
          <Notice tone="error" title="The check didn’t finish">{error.value} <LinkButton onClick={() => { void run() }}>Try again</LinkButton></Notice>
        )}
        {!checking && r?.status === 'source-failed' && <Notice tone="error" title="Could not load your variables">{r.message}</Notice>}
        {!checking && r?.status === 'no-source' && (
          <EmptyState class="bb-varmapper__empty" title="Add a variable source first" description="Variable mapper recommends variables from your Dual File source." hint={r.message} />
        )}
        {!checking && r?.status === 'no-selection' && (
          <EmptyState class="bb-varmapper__empty" title="Select a layer to check" description={`Hard-coded values inside it will be matched to variables in ${r.source.name}.`}
            hint={`Source: ${r.source.name} · ${r.source.variables.toLocaleString()} variables · Dual File`} />
        )}

        {!checking && ready && ready.groups.length === 0 && (
          <EmptyState class="bb-varmapper__empty" title="Everything is bound" description={`${ready.selection.name} has no hard-coded values left.`}
            hint={ready.skippedInstances ? `${plural(ready.skippedInstances, 'instance')} left out: fix those in their main components.` : `Checked against ${ready.source.name}.`} />
        )}

        {!checking && ready && ready.groups.length > 0 && (
          <>
            {put && (
              <Notice tone="info" title={`${plural(put.layers, 'layer')} kept ${put.layers === 1 ? 'its' : 'their'} hard-coded value`}>
                {`Binding changed how ${put.layers === 1 ? 'it looks, so it was' : 'they look, so they were'} restored.${put.values ? ' Your other layers are bound.' : ''} Re-check to see ${put.layers === 1 ? 'it' : 'them'}.`}
              </Notice>
            )}
            <div class="bb-varmapper__selection">
              <h3 class="bb-varmapper__name">{ready.selection.name}</h3>
              <p class="bb-varmapper__meta">{ready.selection.meta}{ready.skippedInstances ? ` · ${plural(ready.skippedInstances, 'instance')} left out` : ''}</p>
            </div>
            <div class="bb-varmapper__tiles">
              <KpiTile showIcon={false} tone="success" value={counts.exact} label="Exact" caption="ready to bind" />
              <KpiTile showIcon={false} tone="neutral" value={counts.check} label="Check" caption="same value, pick one" />
              <KpiTile showIcon={false} tone="warning" value={counts.near} label="Near" caption="changes the value" />
              <KpiTile showIcon={false} tone="danger" value={counts.none} label="No match" caption="pick one by hand" />
            </div>
            <div class="bb-varmapper__filters">
              <SegmentedControl aria-label="Category" options={filterOptions(open, bound.value)} value={filter.value} onChange={(v: Filter) => { filter.value = v }} />
              {exact.length > 0 && <LinkButton onClick={() => { ticked.value = new Set([...ticked.value, ...exact.map((g) => g.id)]) }}>Select exact matches</LinkButton>}
            </div>
            {rows.map((g) => (
              <MapperRow key={g.id} group={g} ticked={ticked.value.has(g.id)} expanded={expanded.value.has(g.id)} variable={variableOf(g)} kind={kindOf(g, picks.value)} source={ready.source.name} showMode={showMode} bound={bound.value.get(g.id)}
                onTick={(on) => { ticked.value = toggled(ticked.value, g.id, on) }}
                onExpand={(on) => { expanded.value = toggled(expanded.value, g.id, on) }}
                onPick={(c) => { picks.value = withEntry(picks.value, g.id, c) }}
                onBind={() => { void bindGroups([g]) }} onUndo={() => { void undo(g) }}
                onSelect={(ids, label) => { void select(ids, label) }} onGoTo={(l) => { void goTo(l) }} />
            ))}
            {rows.length === 0 && <p class="bb-varmapper__meta">Nothing here matches. Try All, or clear the filter.</p>}
          </>
        )}
      </div>

      {chosen.length > 0 && (
        <div class="bb-varmapper__bar">
          <span>{`${plural(chosen.length, 'group')} selected · ${plural(chosen.reduce((n, g) => n + g.layers.length, 0), 'layer')}`}</span>
          <Button onClick={() => { void bindGroups(chosen) }}>{`Bind ${plural(chosen.length, 'group')}`}</Button>
        </div>
      )}

      {toast.value && <Notice class="bb-varmapper__toast" tone={toast.value.tone} title={toast.value.title} aria-live="polite">{toast.value.body}</Notice>}
    </div>
  )
}
