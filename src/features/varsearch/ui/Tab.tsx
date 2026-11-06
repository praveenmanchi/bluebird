import { useEffect } from 'preact/hooks'
import { Button, EmptyState, LinkButton, Notice, SearchBar, SectionTitle, VariableCard, useRpc } from '@shared/ui'
import { pageScopeIds, relativeTime, typesLabel, variableMeta, type PageScope } from '../format'
import {
  MIN_QUERY, MSG,
  type GotoResult, type PagesResult, type RecentSearch, type SearchProgress, type SearchResult, type SelectResult, type Usage, type VariableMatch,
} from '../messages'
import {
  pages, currentPageId, pageScope, types, query, status, progress, result, error, expanded, recent, toast, reset, type Toast,
} from '../state'
import { PagesFilter, TypesFilter } from './Filters'
import { ResultCard } from './Results'
import './variable-search.css'

const TOAST_MS = 4000

function modeLine(scope: PageScope): string {
  if (scope.mode === 'all') return 'All-pages mode: scanning every page in the document.'
  if (scope.mode === 'current') return 'Current-page mode: scanning only the page you are on.'
  return `Scanning ${scope.ids.length === 1 ? '1 selected page' : `${scope.ids.length} selected pages`}.`
}

const message = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback)

/**
 * Variable search tab — Figma "Variable search · 600" (page "Variable Search"),
 * rebuilt from the original Variable search screens: Pages / Type filters, a
 * search field and Search button, then Variable search cards that expand to
 * every component, frame and text style bound to the variable.
 */
export function Tab() {
  const rpc = useRpc()

  useEffect(() => {
    const off = rpc.on<SearchProgress>(MSG.progress, (p) => { progress.value = p })
    rpc.call<PagesResult>(MSG.pages).then((r) => { pages.value = r.pages; currentPageId.value = r.currentPageId }).catch(() => undefined)
    rpc.call<RecentSearch[]>(MSG.recent, {}).then((r) => { recent.value = r }).catch(() => undefined)
    return () => { off(); reset() }
  }, [rpc])

  useEffect(() => {
    if (!toast.value) return
    const id = setTimeout(() => { toast.value = null }, TOAST_MS)
    return () => clearTimeout(id)
  }, [toast.value])

  const notify = (t: Toast) => { toast.value = t }
  const fail = (e: unknown) => notify({ tone: 'error', title: 'That didn’t work', body: message(e, 'Figma did not answer.') })

  async function run(text = query.value) {
    const q = text.trim()
    if (q.length < MIN_QUERY) return
    query.value = q
    status.value = 'searching'
    progress.value = null
    error.value = null
    result.value = null
    try {
      const r = await rpc.call<SearchResult>(MSG.search, { query: q, pageIds: pageScopeIds(pageScope.value, currentPageId.value), types: types.value }, 300_000)
      result.value = r
      expanded.value = new Set(r.variables.slice(0, 1).map((v) => v.id))
      status.value = 'done'
      const top = r.variables[0]
      if (top) {
        const add: RecentSearch = { query: q, name: top.name, meta: variableMeta(top), usage: top.totalNodes, textLike: top.textLike, at: Date.now() }
        rpc.call<RecentSearch[]>(MSG.recent, { add }).then((list) => { recent.value = list }).catch(() => undefined)
      }
    } catch (e: unknown) {
      error.value = message(e, 'Search failed')
      status.value = 'error'
    }
  }

  function clear() {
    status.value = 'idle'
    result.value = null
    error.value = null
  }

  const toggle = (id: string, open: boolean) => {
    const next = new Set(expanded.value)
    if (open) next.add(id); else next.delete(id)
    expanded.value = next
  }

  async function selectAll(v: VariableMatch) {
    const nodeIds = v.usages.flatMap((u) => u.nodeIds)
    if (!nodeIds.length) { notify({ tone: 'info', title: 'Nothing to select on the canvas', body: `${v.name} is only used by text styles.` }); return }
    try {
      const r = await rpc.call<SelectResult>(MSG.select, { nodeIds })
      notify({ tone: 'info', title: `Selected ${r.selected} layer${r.selected === 1 ? '' : 's'} on ${r.page}`,
        body: r.elsewhere ? `${r.elsewhere} more on other pages — use Show layers on a row to open them.` : 'They’re highlighted in the Layers panel.' })
    } catch (e: unknown) { fail(e) }
  }

  async function showLayers(u: Usage) {
    if (u.kind === 'text-style') { notify({ tone: 'info', title: 'Text styles aren’t on the canvas', body: `Find ${u.name} under Text styles in the right panel.` }); return }
    try {
      const r = await rpc.call<SelectResult>(MSG.select, { nodeIds: u.nodeIds })
      notify({ tone: 'info', title: `Selected ${r.selected} layer${r.selected === 1 ? '' : 's'} in ${u.name}`, body: `They’re highlighted in the Layers panel on ${r.page}.` })
    } catch (e: unknown) { fail(e) }
  }

  async function goTo(u: Usage) {
    if (u.kind === 'text-style') { void showLayers(u); return }
    try {
      const r = await rpc.call<GotoResult>(MSG.goto, { nodeId: u.id })
      notify({ tone: 'info', title: `Opened ${r.page}`, body: `Zoomed to ${r.name}. The plugin stays open.` })
    } catch (e: unknown) { fail(e) }
  }

  const busy = status.value === 'searching'
  const r = result.value

  return (
    <div class="bb-varsearch">
      <div class="bb-varsearch__toolbar" role="toolbar" aria-label="Variable search">
        <PagesFilter pages={pages.value} currentPageId={currentPageId.value} scope={pageScope.value} disabled={busy} onChange={(s) => { pageScope.value = s }} />
        <TypesFilter types={types.value} disabled={busy} onChange={(t) => { types.value = t }} />
        <SearchBar class="bb-varsearch__search" value={query.value} label="Variable name" disabled={busy}
          onValueChange={(v) => { query.value = v }} onSubmit={(v) => { void run(v) }} />
        <Button class="bb-varsearch__go" aria-label="Search" leadingIcon="ui-sidebar-search" loading={busy} disabled={query.value.trim().length < MIN_QUERY} onClick={() => { void run() }}>
          Search
        </Button>
      </div>

      <div class="bb-varsearch__content">
        {busy && (
          <>
            <TitleRow title="Search results" />
            <p class="bb-varsearch__status" role="status">
              {progress.value
                ? `Scanning ${progress.value.page} · page ${progress.value.index} of ${progress.value.total} · ${progress.value.visited.toLocaleString()} layers`
                : 'Starting the scan…'}
            </p>
          </>
        )}

        {status.value === 'error' && (
          <Notice tone="error" title="The search didn’t finish">
            {error.value} <LinkButton onClick={() => { void run() }}>Try again</LinkButton>
          </Notice>
        )}

        {status.value === 'done' && r && r.variables.length > 0 && (
          <>
            <TitleRow title="Search results" action="Clear" onAction={clear} />
            <p class="bb-varsearch__status">
              {`${r.variables.length} variable${r.variables.length === 1 ? '' : 's'} · ${r.scannedPages} page${r.scannedPages === 1 ? '' : 's'} scanned · ${r.durationMs} ms`}
            </p>
            {r.variables.map((v) => (
              <ResultCard key={v.id} variable={v} expanded={expanded.value.has(v.id)} onToggle={(open) => toggle(v.id, open)}
                onSelectAll={(x) => { void selectAll(x) }} onShowLayers={(u) => { void showLayers(u) }} onGoTo={(u) => { void goTo(u) }} />
            ))}
          </>
        )}

        {status.value === 'done' && r && r.variables.length === 0 && (
          <EmptyState
            class="bb-varsearch__empty"
            title="No results"
            description={r.matched
              ? `No ${types.value.length ? typesLabel(types.value).toLowerCase() : 'layers'} on the ${r.scannedPages === 1 ? 'selected page' : `${r.scannedPages} pages scanned`} use “${r.query}”.`
              : `No variable is named like “${r.query}”.`}
            hint={r.matched ? 'Try All types or All Pages.' : 'Check the spelling, or search part of the name (for example border/default).'}
          />
        )}

        {status.value === 'idle' && recent.value.length > 0 && (
          <>
            <TitleRow title="Recent searches" action="Clear all" onAction={() => {
              rpc.call<RecentSearch[]>(MSG.recentClear).then((list) => { recent.value = list }).catch(() => undefined)
            }} />
            {recent.value.map((s) => (
              <VariableCard key={s.name} kind={s.textLike ? 'text-style' : 'variable'} name={s.name} meta={s.meta}
                updated={relativeTime(s.at)} changeCount={s.usage} expanded={false}
                onToggle={() => { query.value = s.name; void run(s.name) }}
                onInspect={() => { query.value = s.name; void run(s.name) }} />
            ))}
          </>
        )}

        {status.value === 'idle' && recent.value.length === 0 && (
          <EmptyState class="bb-varsearch__empty" title="Search variables" description="Type a variable name to search." hint={modeLine(pageScope.value)} />
        )}
      </div>

      {toast.value && (
        <Notice class="bb-varsearch__toast" tone={toast.value.tone} title={toast.value.title} aria-live="polite">{toast.value.body}</Notice>
      )}
    </div>
  )
}

/** Figma "Section Title" (count hidden), the heading every tab uses: "Recent Searches" / "Search Results" + Clear. */
function TitleRow({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <SectionTitle class="bb-varsearch__heading" title={title} showCount={false} showAction={!!action} actionLabel={action} onAction={onAction} />
}
