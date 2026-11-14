import { useEffect } from 'preact/hooks'
import { MetaBadge, PublishEmptyState, SearchBar, SectionTitle } from '@shared/ui'
import { SEARCH_KIND_LABEL, type EntryMatch } from '../search'
import { closeSearch, searchQuery, searchText } from '../state'
import { EntryCard } from './EntryCard'

const SEARCH_ID = 'bb-history-search'

export const HISTORY_PLACEHOLDER = 'Paste a variable path, colour, Jira ticket or component'
export const VERSIONS_PLACEHOLDER = 'Search versions by name, description or author'

/** The bar the magnifier opens: focused at once so a paste lands in it; Escape closes it. */
export function HistorySearchBar({ placeholder = HISTORY_PLACEHOLDER }: { placeholder?: string }) {
  useEffect(() => { document.querySelector<HTMLInputElement>(`#${SEARCH_ID} input`)?.focus() }, [])
  return (
    <SearchBar
      id={SEARCH_ID}
      class="bb-history__search"
      value={searchText.value}
      label="Search the team history"
      placeholder={placeholder}
      onValueChange={(v) => { searchText.value = v }}
      onKeyDown={(e) => { if (e.key === 'Escape') closeSearch() }}
      inputProps={{ spellcheck: false, autoComplete: 'off' }}
    />
  )
}

export interface SearchResultsProps {
  matches: readonly EntryMatch[]
  /** The range the list covers, for the empty state. */
  days: number
  /** The feature filter's label, or '' for All. */
  feature: string
  jiraSite: string
  onOpen: (id: string) => void
  onOpenUrl: (url: string) => void
}

/**
 * What the History search found: the entries that touched the pasted ticket,
 * colour, variable path or component, each card showing only the matching changes.
 */
export function SearchResults({ matches, days, feature, jiraSite, onOpen, onOpenUrl }: SearchResultsProps) {
  const q = searchQuery.value
  if (!q) return null
  const kind = SEARCH_KIND_LABEL[q.kind]
  if (!matches.length) {
    return (
      <PublishEmptyState
        state="first-release"
        title={`Nothing touched ${q.raw}`}
        body={`No ${feature ? `${feature} ` : ''}entry in the last ${days} days mentions the ${kind.toLowerCase()} ${q.raw}. Try a wider range, ${feature ? 'All features, ' : ''}or paste the exact name.`}
        actions={[]}
      />
    )
  }
  return (
    <section class="bb-history__day" aria-label="Search results">
      <div class="bb-history__results-head">
        <SectionTitle title={`Results for ${q.raw}`} showCount count={matches.length} showAction={false} />
        <MetaBadge tone="neutral">{kind}</MetaBadge>
      </div>
      <ul class="bb-history__list">
        {matches.map((m) => (
          <li key={m.entry.id}>
            <EntryCard entry={m.entry} jiraSite={jiraSite} hits={m.hits} onOpen={() => onOpen(m.entry.id)} onOpenUrl={onOpenUrl} />
          </li>
        ))}
      </ul>
    </section>
  )
}
