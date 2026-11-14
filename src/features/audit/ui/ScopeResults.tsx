import { Button, EmptyState, SectionTitle, SegmentedControl } from '@shared/ui'
import { requestTab } from '@shared/navigation'
import { filterOptions, itemsOnScreen, plural, visibleItems, type Filter } from '../format'
import type { AuditItem, AuditResult, Place } from '../messages'
import { ItemCard } from './Results'
import { Overview } from './Overview'
import { Summary } from './Summary'

type Ready = Extract<AuditResult, { status: 'ready' }>

export interface ScopeResultsProps {
  result: Ready
  filter: Filter
  /** The screen opened from the overview; null for the whole audit. */
  screenId: string | null
  details: boolean
  expanded: ReadonlySet<string>
  onFilter: (filter: Filter) => void
  onScreen: (id: string | null) => void
  onDetails: (open: boolean) => void
  onExpanded: (ids: ReadonlySet<string>) => void
  onSelect: (nodeIds: readonly string[], label: string) => void
  onGoTo: (place: Place) => void
}

/** The audit of this scope: the whole result, or one screen opened from it. */
export function ScopeResults(props: ScopeResultsProps) {
  const { result, filter, screenId, expanded, onFilter, onExpanded, onSelect, onGoTo } = props
  const screen = screenId ? result.screens.find((s) => s.id === screenId) : undefined
  const hasLibrary = !!result.source
  const scoped = screen ? itemsOnScreen(result.items, screen.id) : result.items.map((item) => ({ item, meta: undefined as string | undefined }))
  const all = scoped.map((s) => s.item)
  const shown = new Set(visibleItems(all, filter).map((i) => i.id))
  const cards = scoped.filter((s) => shown.has(s.item.id))

  const card = ({ item, meta }: { item: AuditItem; meta: string | undefined }) => (
    <ItemCard key={item.id} item={item} meta={meta} expanded={expanded.has(item.id)}
      onToggle={(open) => {
        const next = new Set(expanded)
        if (open) next.add(item.id); else next.delete(item.id)
        onExpanded(next)
      }}
      onSelect={onSelect} onGoTo={onGoTo} />
  )
  const list = (
    <>
      {(filter === 'colours' || filter === 'spacing') && cards.length > 0 && (
        <div class="bb-audit__actions"><Button variant="secondary" onClick={() => requestTab('varmapper')}>Fix these in Variable mapper</Button></div>
      )}
      {cards.map(card)}
      {!cards.length && <p class="bb-audit__status">Nothing here.</p>}
    </>
  )

  if (screen) {
    return (
      <>
        <SectionTitle class="bb-audit__heading" title={screen.name} showCount={false} actionLabel="All screens" onAction={() => props.onScreen(null)} />
        <Summary title="Screen summary" badge={screen.name} stats={screen.page} coverage={screen} hasLibrary={hasLibrary} />
        <SegmentedControl class="bb-audit__segments" aria-label="Not mapped on this screen" options={filterOptions(all, { overview: false, hasLibrary })} value={filter} onChange={onFilter} />
        {list}
      </>
    )
  }

  const c = result.counts
  return (
    <>
      <Summary title="Audit summary" badge={result.scope} stats={`${plural(result.visited, 'layer')} · ${result.durationMs} ms`} hasLibrary={hasLibrary}
        coverage={{ bound: c.bound, paints: c.paints, library: c.library, components: c.total }}
        details={{ open: props.details, counts: c, onToggle: props.onDetails }} />
      {result.problem && <EmptyState class="bb-audit__block" title="Components need a library" description="Variables are checked. Add a Components file to audit components too." hint={result.problem} />}
      {all.length === 0 && <EmptyState class="bb-audit__empty" title="Everything is mapped" description="Everything in this scope comes from the design system." />}
      {all.length > 0 && (
        <>
          <SegmentedControl class="bb-audit__segments" aria-label="Results" options={filterOptions(all, { overview: true, hasLibrary })} value={filter} onChange={onFilter} />
          {filter === 'overview' ? <Overview result={result} onScreen={props.onScreen} /> : list}
        </>
      )}
    </>
  )
}
