import { Avatar, Button, CheckItem, CodeSnippet, LinkButton, Message, MetaBadge, Notice, PublishStep, SectionTitle, ValueDiff } from '@shared/ui'
import { copyText } from '@shared/clipboard'
import type { HistoryEntry, HistorySection } from '@shared/history/types'
import { STATUS_TONE, TYPE_LABEL, initials, longDate, statusLabel, typeTone } from '../format'
import { approvalComment, entryBranchUrl } from '../review'
import { JiraComment } from './ReviewOptions'

export interface EntryDetailsProps {
  entry: HistoryEntry
  jiraSite: string
  onBack: () => void
  onOpenUrl: (url: string) => void
  /** Approve a changelog that is under review; omitted where nothing can be approved. */
  onApprove?: () => void
  /** The approval is being saved. */
  approving?: boolean
  approveError?: string | null
  /** The reviewer posts the approval to the changelog's ticket. */
  postToJira?: boolean
  onPostToJiraChange?: (on: boolean) => void
}

const CHANGE_TONE = { added: 'success', modified: 'accent', removed: 'danger' } as const
const CHANGE_LABEL = { added: 'Added', modified: 'Modified', removed: 'Removed' } as const

function Changes({ section }: { section: Extract<HistorySection, { kind: 'changes' }> }) {
  const total = section.groups.reduce((n, g) => n + g.rows.length, 0)
  return (
    <section class="bb-history__card" aria-label={section.title}>
      <SectionTitle title={section.title} showCount count={total} showAction={false} />
      {section.groups.filter((g) => g.rows.length).map((g) => (
        <div key={g.change} class="bb-history__group">
          <div class="bb-history__group-head"><MetaBadge tone={CHANGE_TONE[g.change]}>{CHANGE_LABEL[g.change]}</MetaBadge><span class="bb-history__hint">{g.rows.length} {section.unit ?? 'variable'}{g.rows.length === 1 ? '' : 's'}</span></div>
          <ul class="bb-history__list">
            {g.rows.map((r) => (
              <li key={r.name} class="bb-history__change">
                <div class="bb-history__change-row">
                  <span class="bb-history__change-name">{r.name}</span>
                  {r.valueKind === 'text'
                    ? (r.old || r.new) && <span class="bb-history__hint">{[r.old, r.new].filter(Boolean).join(' → ')}</span>
                    : <ValueDiff kind={r.valueKind} old={r.old ?? '—'} new={r.new ?? '—'} />}
                  {(r.breaking || r.scope) && <MetaBadge tone={r.breaking ? 'danger' : 'neutral'}>{r.breaking ? 'Breaking' : r.scope}</MetaBadge>}
                </div>
                {r.note && <span class="bb-history__hint">{r.note}</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}

function Section({ section }: { section: HistorySection }) {
  if (section.kind === 'changes') return <Changes section={section} />
  return (
    <section class="bb-history__card" aria-label={section.title}>
      <SectionTitle title={section.title} showCount={section.kind !== 'code'} count={section.kind === 'code' ? undefined : section.rows.length} showAction={false} />
      {section.kind === 'items' && (
        <>
          {section.hint && <p class="bb-history__hint">{section.hint}</p>}
          <ul class="bb-history__list">{section.rows.map((r, i) => <li key={i}><CheckItem status={r.status} title={r.title} detail={r.detail} showAction={false} /></li>)}</ul>
        </>
      )}
      {section.kind === 'messages' && <div class="bb-history__list">{section.rows.map((r, i) => <Message key={i} role={r.role} text={r.text} />)}</div>}
      {section.kind === 'code' && <CodeSnippet language={section.language} code={section.code} onCopy={() => { void copyText(section.code) }} />}
    </section>
  )
}

/**
 * Figma "History · 4 Entry details" (one per entry type): header with the facts and
 * numbers, an optional notice, the type's own sections, the activity log and the links.
 * Everything comes from the entry, so every type renders through this one screen.
 */
export function EntryDetails({ entry, jiraSite, onBack, onOpenUrl, onApprove, approving = false, approveError, postToJira = true, onPostToJiraChange }: EntryDetailsProps) {
  const d = entry.details ?? {}
  const ticketUrl = entry.ticket && jiraSite ? `${jiraSite}/browse/${entry.ticket}` : ''
  const branch = entryBranchUrl(entry)
  const reviewing = entry.status === 'review' && !!onApprove
  return (
    <div class="bb-history__details">
      <LinkButton class="bb-history__back" onClick={onBack}>← Back to history</LinkButton>
      <section class="bb-history__card" aria-label="Entry">
        <div class="bb-history__badges">
          {entry.variables && <MetaBadge tone="neutral" meta={entry.variables}>Variables</MetaBadge>}
          {entry.components && <MetaBadge tone="neutral" meta={entry.components}>Components</MetaBadge>}
          <MetaBadge tone={STATUS_TONE[entry.status]}>{statusLabel(entry)}</MetaBadge>
          <span class="bb-history__grow" />
          {entry.ticket && (ticketUrl ? <LinkButton onClick={() => onOpenUrl(ticketUrl)}>Jira {entry.ticket}</LinkButton> : <span class="bb-history__hint">Jira {entry.ticket}</span>)}
        </div>
        <h2 class="bb-history__title">{entry.title}</h2>
        <div class="bb-history__who">
          <div class="bb-history__person">
            <Avatar size="md" name={entry.by.name}>{initials(entry.by.name)}</Avatar>
            <div class="bb-history__stack">
              <span class="bb-history__name">{entry.by.name}</span>
              {entry.by.team && <span class="bb-history__hint">{entry.by.team}</span>}
            </div>
          </div>
          <div class="bb-history__stack bb-history__stack--end">
            <time class="bb-history__date" dateTime={entry.at}>{longDate(entry.at)}</time>
            <span class="bb-history__hint">{entry.file}</span>
            <MetaBadge tone={typeTone(entry)}>{TYPE_LABEL[entry.type]}</MetaBadge>
          </div>
        </div>
        <p class="bb-history__body">{d.description ?? entry.summary}</p>
        {d.facts && d.facts.length > 0 && (
          <dl class="bb-history__facts">
            {d.facts.map((f) => (
              <div key={f.label} class="bb-history__fact">
                <dt class="bb-history__hint">{f.label}</dt>
                <dd>{f.value === branch && branch ? <LinkButton onClick={() => onOpenUrl(branch)}>Open the branch in Figma</LinkButton> : f.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {d.stats && d.stats.length > 0 && (
          <div class="bb-history__stats">
            {d.stats.map((s) => <div key={s.label} class="bb-history__stat"><span class="bb-history__stat-value">{s.value}</span><span class="bb-history__hint">{s.label}</span></div>)}
          </div>
        )}
      </section>
      {d.notice && <Notice tone={d.notice.tone} title={d.notice.title}>{d.notice.body}</Notice>}
      {(d.sections ?? []).map((s, i) => <Section key={i} section={s} />)}
      {d.activity && d.activity.length > 0 && (
        <section class="bb-history__card" aria-label="Activity">
          <SectionTitle title="Activity" showCount count={d.activity.length} showAction={false} />
          <div class="bb-history__steps">{d.activity.map((a, i) => <PublishStep key={i} status="done" title={a.title} detail={a.detail} time={a.time} />)}</div>
        </section>
      )}
      {reviewing && entry.ticket && onPostToJiraChange && (
        <section class="bb-history__card" aria-label="Jira ticket">
          <SectionTitle title="Jira ticket" showCount={false} showAction={false} />
          <p class="bb-history__body">{ticketUrl ? <LinkButton onClick={() => onOpenUrl(ticketUrl)}>{entry.ticket}</LinkButton> : entry.ticket} · linked by {entry.by.name} when it was sent for review</p>
          <JiraComment
            ticket={entry.ticket} label={`Post the approval to ${entry.ticket} as a Jira comment`} checked={postToJira} disabled={approving}
            author="You" time="Posted when you approve" body={approvalComment(entry, 'you', '').split('\nFigma branch:')[0]!} branch={branch}
            onChange={onPostToJiraChange} onOpenUrl={onOpenUrl}
          />
        </section>
      )}
      {approveError && <Notice tone="error" title="Not approved">{approveError}</Notice>}
      <div class="bb-history__actions">
        {entry.status === 'review' && onApprove && <Button variant="primary" loading={approving} onClick={onApprove}>Approve and publish</Button>}
        {entry.link && <Button variant="primary" onClick={() => onOpenUrl(entry.link!.url)}>{entry.link.label}</Button>}
        {entry.link && <Button variant="secondary" onClick={() => { void copyText(entry.link!.url) }}>Copy link</Button>}
      </div>
    </div>
  )
}
