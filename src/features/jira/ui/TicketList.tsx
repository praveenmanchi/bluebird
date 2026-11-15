import { useEffect, useRef, useState } from 'preact/hooks'
import { Button, Icon, JiraEmptyState, LinkButton, MetaBadge, Notice, SearchBar, TicketRow, useRpc, type IconName } from '@shared/ui'
import {
  PRIORITY_LABEL, PRIORITY_ORDER, SCOPE_LABEL, STATUS_META, STATUS_ORDER,
  filterTickets, groupByStatus, hasActiveFilters, refined, sprintOptions, syncedLabel, type PriorityFilter, type StatusFilter,
} from '../board'
import { loadBoard } from '../actions'
import type { TicketScope } from '../types'
import { defaultFilters, filters, refreshError, refreshing, selectedKey, setFilter, syncedAt, tickets, truncated } from '../state'
import { FilterSelect, type FilterOption } from './FilterSelect'

/** The scope trigger is 111 wide in Figma, so "Assigned to me" shows as "Assigned" there; the menu keeps the full label. */
const SCOPE_OPTIONS: readonly FilterOption<TicketScope>[] = (Object.keys(SCOPE_LABEL) as TicketScope[])
  .map((s) => ({ value: s, label: SCOPE_LABEL[s], display: s === 'assigned' ? 'Assigned' : undefined }))

const STATUS_OPTIONS: readonly FilterOption<StatusFilter>[] = [
  { value: 'all', label: 'All', display: 'Status: All' },
  ...STATUS_ORDER.map((s) => ({ value: s, label: STATUS_META[s].option, display: `Status: ${STATUS_META[s].option}` })),
]
const PRIORITY_OPTIONS: readonly FilterOption<PriorityFilter>[] = [
  { value: 'all', label: 'All', display: 'Priority: All' },
  ...PRIORITY_ORDER.map((p) => ({ value: p, label: PRIORITY_LABEL[p], display: `Priority: ${PRIORITY_LABEL[p]}` })),
]

/** Figma "Tab Icon=Filter" (Tab Icons set, 40002937:7174) — the funnel on the Filter toggle. */
const FILTER_ICON: IconName = 'filter'

/**
 * Figma "Jira board / Ticket list": header, the scope dropdown with search and
 * filter toggles beside it, the panels they open, and the status-grouped rows.
 * Search and Status / Sprint / Priority stay tucked away until asked for, so the
 * list opens on the current sprint's tickets.
 */
export function TicketList() {
  const rpc = useRpc()
  const f = filters.value
  const defaults = defaultFilters.value
  const shown = filterTickets(tickets.value, f)
  const groups = groupByStatus(shown)
  const sprints = sprintOptions(tickets.value, f.sprint).map((s) => ({ value: s, label: s }))
  const [searchOpen, setSearchOpen] = useState(f.query !== '')
  const [filtersOpen, setFiltersOpen] = useState(refined(f, defaults))
  const failed = refreshError.value
  const refreshLabel = refreshing.value ? 'Syncing…' : failed ? 'Sync failed · Retry' : `${syncedLabel(syncedAt.value, Date.now())} · Refresh`
  const section = useRef<HTMLElement>(null)
  const focusSearch = useRef(false)

  // Opening search from the toggle puts the caret in it (autofocus only applies on page load).
  useEffect(() => {
    if (!searchOpen || !focusSearch.current) return
    focusSearch.current = false
    section.current?.querySelector<HTMLInputElement>('#bb-jira-board-search input')?.focus()
  }, [searchOpen])

  // Closing search clears it, so a hidden query never filters the list unseen.
  const toggleSearch = () => {
    if (searchOpen) setFilter('query', '')
    focusSearch.current = !searchOpen
    setSearchOpen(!searchOpen)
  }

  return (
    <section ref={section} class="bb-jira-board__list" aria-label="My tickets">
      <div class="bb-jira-board__list-header">
        <div class="bb-jira-board__list-title">
          <Icon name="jira" class="bb-jira-board__title-icon" />
          <h2 class="bb-jira-board__list-heading">My tickets</h2>
          <MetaBadge tone="neutral">{shown.length}</MetaBadge>
        </div>
        <LinkButton disabled={refreshing.value} onClick={() => { void loadBoard(rpc, { refresh: true }) }}>{refreshLabel}</LinkButton>
      </div>

      <div class="bb-jira-board__scope-search">
        <FilterSelect class="bb-jira-board__scope" label="Which tickets" value={f.scope} options={SCOPE_OPTIONS} onChange={(v) => setFilter('scope', v)} />
        <Button
          class="bb-jira-board__toggle"
          variant="secondary"
          leadingIcon="tool-search"
          aria-label="Search tickets"
          aria-expanded={searchOpen}
          aria-controls="bb-jira-board-search"
          onClick={toggleSearch}
        />
        <Button
          class="bb-jira-board__toggle"
          variant="secondary"
          leadingIcon={FILTER_ICON}
          aria-label="Filters"
          aria-expanded={filtersOpen}
          aria-controls="bb-jira-board-filters"
          data-active={refined(f, defaults) || undefined}
          onClick={() => setFiltersOpen(!filtersOpen)}
        />
      </div>

      {truncated.value && <p class="bb-jira-board__notice" role="status">Showing the 500 latest tickets. Add a Project Key in Settings to narrow it.</p>}

      {failed && (
        <Notice class="bb-jira-board__sync-error" tone="error" title="Couldn’t refresh tickets">
          {`Showing what loaded earlier. ${failed}`}
        </Notice>
      )}

      {searchOpen && (
        <SearchBar
          id="bb-jira-board-search"
          class="bb-jira-board__search"
          label="Search tickets"
          placeholder="Search by key, title or label"
          value={f.query}
          onValueChange={(q) => setFilter('query', q)}
          inputProps={{ onKeyDown: (e) => { if (e.key === 'Escape') toggleSearch() } }}
        />
      )}

      {filtersOpen && (
        <div id="bb-jira-board-filters" class="bb-jira-board__filters" role="group" aria-label="Filters">
          <FilterSelect class="bb-jira-board__filter bb-jira-board__filter--status" label="Status" value={f.status} options={STATUS_OPTIONS} onChange={(v) => setFilter('status', v)} />
          <FilterSelect class="bb-jira-board__filter bb-jira-board__filter--sprint" label="Sprint" value={f.sprint} options={sprints} onChange={(v) => setFilter('sprint', v)} />
          <FilterSelect class="bb-jira-board__filter bb-jira-board__filter--priority" label="Priority" value={f.priority} options={PRIORITY_OPTIONS} onChange={(v) => setFilter('priority', v)} />
        </div>
      )}

      <div class="bb-jira-board__tickets">
        {groups.length === 0 && (
          <JiraEmptyState
            state="no-tickets"
            title={hasActiveFilters(f, defaults) ? 'No tickets match' : undefined}
            onAction={() => { filters.value = { ...defaults, scope: f.scope } }}
          />
        )}
        {groups.map((g) => (
          <section key={g.status} class="bb-jira-board__group" aria-label={g.heading}>
            <h3 class="bb-jira-board__group-heading">{g.heading}</h3>
            {g.tickets.map((t) => (
              <TicketRow
                key={t.key}
                class="bb-jira-board__row"
                issueKey={t.key}
                title={t.title}
                issueType={t.type}
                status={STATUS_META[t.status].badge}
                statusTone={STATUS_META[t.status].tone}
                priority={t.priority}
                points={String(t.points)}
                selected={t.key === selectedKey.value}
                onSelect={(key) => { selectedKey.value = key }}
              />
            ))}
          </section>
        ))}
      </div>
    </section>
  )
}
