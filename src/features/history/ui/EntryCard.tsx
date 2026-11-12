import { Button, ChangeStatus, Icon, LinkButton, MetaBadge, type IconName } from '@shared/ui'
import { teamShort } from '@shared/history/store'
import type { HistoryEntry } from '@shared/history/types'
import { STATUS_LABEL, STATUS_TONE, TYPE_LABEL, cardDate, changeCounts, countsLabel, typeTone } from '../format'

export interface EntryCardProps {
  entry: HistoryEntry
  /** Settings › Jira site; '' shows the ticket without a link. */
  jiraSite: string
  onOpen: () => void
  onOpenUrl: (url: string) => void
}

/**
 * One footer group: the icon, then a Change Status pill per count in the line
 * (Updated / Added / Removed) and whatever else the line says as text.
 */
function Changes({ what, icon, line }: { what: string; icon: IconName; line: string }) {
  const parsed = changeCounts(line)
  return (
    <span class="bb-history-card__change" role="group" aria-label={countsLabel(what, parsed)}>
      <Icon name={icon} aria-hidden="true" />
      {parsed.counts.map((c) => <ChangeStatus key={c.status} status={c.status} count={c.count} />)}
      {parsed.rest && <span>{parsed.rest}</span>}
    </span>
  )
}

/**
 * Figma "History Entry" (Molecules › History, 40002709:7089): type and title on the
 * left; Jira ticket, date, name and team on the right; what happened; then the
 * variable and component changes (Change Status pills, a rule between the two
 * groups) and View details. Failed entries get the red stroke.
 */
export function EntryCard({ entry, jiraSite, onOpen, onOpenUrl }: EntryCardProps) {
  const team = teamShort(entry.by.team)
  const ticketUrl = entry.ticket && jiraSite ? `${jiraSite}/browse/${entry.ticket}` : ''
  return (
    <article class="bb-history-card" data-status={entry.status} aria-label={`${TYPE_LABEL[entry.type]}: ${entry.title}`}>
      <div class="bb-history-card__header">
        <div class="bb-history-card__titles">
          <span class="bb-history-card__badges">
            <MetaBadge tone={typeTone(entry)}>{TYPE_LABEL[entry.type]}</MetaBadge>
            {entry.status === 'review' && <MetaBadge tone={STATUS_TONE.review}>{STATUS_LABEL.review}</MetaBadge>}
          </span>
          <h3 class="bb-history-card__title">{entry.title}</h3>
        </div>
        <div class="bb-history-card__meta">
          <div class="bb-history-card__when">
            {entry.ticket && (
              <span class="bb-history-card__jira">
                <Icon name="jira" class="bb-history-card__jira-logo" aria-hidden="true" />
                {ticketUrl
                  ? <LinkButton aria-label={`Open ${entry.ticket} in Jira`} onClick={() => onOpenUrl(ticketUrl)}>{entry.ticket}</LinkButton>
                  : <span>{entry.ticket}</span>}
              </span>
            )}
            <time class="bb-history-card__date" dateTime={entry.at}>{cardDate(entry.at)}</time>
          </div>
          <div class="bb-history-card__person">
            <span class="bb-history-card__name">{entry.by.name}</span>
            {team && <><span class="bb-history-card__sep" aria-hidden="true">|</span><span class="bb-history-card__team" title={entry.by.team}>{team}</span></>}
          </div>
        </div>
      </div>
      <p class="bb-history-card__what">{entry.summary}</p>
      <div class="bb-history-card__footer">
        <div class="bb-history-card__changes">
          {entry.variables && <Changes what="Variables" icon="variables" line={entry.variables} />}
          {entry.variables && entry.components && <span class="bb-history-card__rule" aria-hidden="true" />}
          {entry.components && <Changes what="Components" icon="ui-toolbar-component" line={entry.components} />}
        </div>
        <Button variant="secondary" trailingIcon="ui-prototype-navigate-to" onClick={onOpen} aria-label={`View details: ${entry.title}`}>{entry.status === 'review' ? 'Review' : 'View details'}</Button>
      </div>
    </article>
  )
}
