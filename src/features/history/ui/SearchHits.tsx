import { ChangeRow, Icon, LinkButton, type ChangeRowKind } from '@shared/ui'
import type { ChangeRowData, SearchHit } from '../search'

/** Matches a card shows before "N more in details". */
export const HITS_SHOWN = 3

const rowKind = (hit: Extract<SearchHit, { kind: 'change' }>): ChangeRowKind =>
  hit.unit === 'component' ? 'component' : hit.row.valueKind === 'color' ? 'color' : 'number'

/** "#0C8CE9 → #0978C8 · Bridge, Ikea · Breaking", or the component's note. */
function rowDetail(row: ChangeRowData): string {
  const value = row.valueKind === 'text' ? row.note : row.old && row.new ? `${row.old} → ${row.new}` : row.new ?? row.old
  return [value, row.valueKind !== 'text' ? row.scope : undefined, row.breaking ? 'Breaking' : undefined].filter(Boolean).join(' · ')
}

function Hit({ hit }: { hit: SearchHit }) {
  if (hit.kind === 'change') {
    return (
      <ChangeRow
        kind={rowKind(hit)}
        name={hit.row.name}
        detail={rowDetail(hit.row)}
        change={hit.change}
        swatch={hit.row.new ?? hit.row.old ?? ''}
        showInclude={false}
        title={hit.row.note}
      />
    )
  }
  return (
    <div class="bb-history-hit">
      <Icon name={hit.kind === 'item' ? 'ui-toolbar-component' : 'documentation'} class="bb-history-hit__icon" aria-hidden="true" />
      <span class="bb-history-hit__text">
        <span class="bb-history-hit__where">{hit.kind === 'item' ? hit.section : hit.where}</span>
        {hit.kind === 'item' ? <><strong class="bb-history-hit__title">{hit.title}</strong> {hit.detail}</> : hit.text}
      </span>
    </div>
  )
}

export interface SearchHitsProps {
  hits: readonly SearchHit[]
  /** Opens Entry details, for the matches the card leaves out. */
  onMore: () => void
}

/** The changes on one History card that match the search, under the summary. */
export function SearchHits({ hits, onMore }: SearchHitsProps) {
  if (!hits.length) return null
  const more = hits.length - HITS_SHOWN
  return (
    <div class="bb-history-card__matches" role="group" aria-label={`${hits.length} ${hits.length === 1 ? 'match' : 'matches'}`}>
      {hits.slice(0, HITS_SHOWN).map((h, i) => <Hit key={i} hit={h} />)}
      {more > 0 && <LinkButton class="bb-history-card__more" onClick={onMore}>{more} more in details</LinkButton>}
    </div>
  )
}
