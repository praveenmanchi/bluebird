import {
  Button, Checkbox, EXTERNAL_LINK_ICON, FieldRow, FigmaLinkCard, Icon, IssueType, LinkButton, PriorityIcon, SectionTitle, useRpc,
} from '@shared/ui'
import { openExternal, write } from '../actions'
import { PRIORITY_LABEL, STATUS_META, STATUS_ORDER, subtaskProgress } from '../board'
import { MSG } from '../messages'
import { activityTab, busy, issueUrl, notice } from '../state'
import type { FigmaLink, Ticket, TicketStatus } from '../types'
import { ActivitySection } from './ActivitySection'
import { FilterSelect, type FilterOption } from './FilterSelect'
import { PointsPicker } from './PointsPicker'

const STATUS_OPTIONS: readonly FilterOption<TicketStatus>[] = STATUS_ORDER.map((s) => ({ value: s, label: STATUS_META[s].option }))
/** "Log work" logs one hour; finer entries are made in Jira. */
const LOG_WORK_SECONDS = 3600

async function copyText(text: string, what: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    notice.value = `Copied ${what}.`
  } catch {
    notice.value = `Couldn’t copy ${what} — clipboard access is blocked here.`
  }
}

/** Figma "Jira board / Ticket detail" for one issue. Every edit is a Jira write; the panel shows what Jira stored. */
export function TicketDetail({ ticket }: { ticket: Ticket }) {
  const rpc = useRpc()
  const key = ticket.key
  const url = issueUrl(key)
  const working = busy.value !== null
  const openInJira = (why?: string) => { if (why) notice.value = why; openExternal(rpc, url) }

  function openLink(link: FigmaLink) {
    notice.value = null
    if (!link.nodeId) { if (link.url) openExternal(rpc, link.url); return }
    // The frame may live in another file: fall back to the browser when it isn't in this one.
    rpc.call(MSG.focus, { nodeId: link.nodeId }).catch(() => {
      if (link.url) openExternal(rpc, link.url)
      else notice.value = 'That frame is not in this file.'
    })
  }

  const half = Math.ceil(ticket.subtasks.length / 2)
  const subtaskColumns = [ticket.subtasks.slice(0, half), ticket.subtasks.slice(half)]

  return (
    <section class="bb-jira-board__detail" aria-label={`${ticket.key} ${ticket.title}`}>
      <div class="bb-jira-board__breadcrumb">
        <nav class="bb-jira-board__path" aria-label="Issue path">
          {ticket.parent && (
            <>
              <IssueType type={ticket.parent.type} />
              <span class="bb-jira-board__crumb">{`${ticket.parent.key} ${ticket.parent.title}`}</span>
              <span class="bb-jira-board__crumb" aria-hidden="true">/</span>
            </>
          )}
          <IssueType type={ticket.type} />
          <span class="bb-jira-board__crumb-key">{ticket.key}</span>
        </nav>
        <div class="bb-jira-board__actions">
          <button type="button" class="bb-jira-board__icon-button" aria-label="Copy issue link" onClick={() => { void copyText(url, `the link to ${key}`) }}>
            <Icon name="copy" class="bb-jira-board__action-icon" />
          </button>
          <LinkButton icon={EXTERNAL_LINK_ICON} onClick={() => openInJira()}>Open in Jira</LinkButton>
        </div>
      </div>

      <h2 class="bb-jira-board__title">{ticket.title}</h2>

      <div class="bb-jira-board__quick">
        <div class="bb-jira-board__fields">
          <FilterSelect class="bb-jira-board__status" label="Status" value={ticket.status} options={STATUS_OPTIONS} onChange={(status) => { if (status !== ticket.status) void write(rpc, MSG.status, { key, status }, 'Changing status…', 'Couldn’t change the status.') }} />
          <span class="bb-jira-board__points">
            <span class="bb-jira-board__field-label">Story points</span>
            <PointsPicker points={ticket.points} onChange={(points) => { if (points !== ticket.points) void write(rpc, MSG.points, { key, points }, 'Saving story points…', 'Couldn’t save the story points.') }} />
          </span>
          <span class="bb-jira-board__priority">
            <PriorityIcon priority={ticket.priority} class="bb-jira-board__priority-icon" />
            <span class="bb-jira-board__priority-label">{PRIORITY_LABEL[ticket.priority]}</span>
          </span>
        </div>
        <Button
          class="bb-jira-board__log-work"
          variant="secondary"
          disabled={working}
          onClick={async () => { if (await write(rpc, MSG.worklog, { key, seconds: LOG_WORK_SECONDS }, 'Logging work…', 'Couldn’t log work.')) activityTab.value = 'Work log' }}
        >
          Log work
        </Button>
      </div>

      <div class="bb-jira-board__details">
        <div class="bb-jira-board__column">
          <FieldRow label="Assignee" showAvatar={false}>{ticket.assignee.name}</FieldRow>
          <FieldRow label="Sprint" showAvatar={false}>{ticket.sprint ? `${ticket.sprint}${ticket.sprintEnds ? ` · ends ${ticket.sprintEnds}` : ''}` : 'None'}</FieldRow>
          <FieldRow label="Labels" showAvatar={false}>{ticket.labels.join(', ') || 'None'}</FieldRow>
        </div>
        <div class="bb-jira-board__column">
          <FieldRow label="Reporter" showAvatar={false}>{ticket.reporter.name}</FieldRow>
          <FieldRow label="Due date" showAvatar={false}>{ticket.dueDate || 'None'}</FieldRow>
          <FieldRow label="Fix version" showAvatar={false}>{ticket.fixVersion || 'None'}</FieldRow>
        </div>
      </div>

      <SectionTitle title="Description" showCount={false} actionLabel="Edit" onAction={() => openInJira('Edit the description in Jira; Refresh to see it here.')} />
      <p class="bb-jira-board__description">{ticket.description || 'No description.'}</p>

      <SectionTitle title="Figma links" count={String(ticket.links.length)} actionLabel="Attach Figma link" onAction={() => { void write(rpc, MSG.link, { key }, 'Attaching the Figma frame…', 'Couldn’t attach the Figma frame.') }} />
      {ticket.links.length > 0 && (
        <div class="bb-jira-board__links">
          {ticket.links.map((link) => (
            <FigmaLinkCard
              key={link.id}
              class="bb-jira-board__link"
              frame={link.frame}
              path={link.path}
              onOpen={() => openLink(link)}
              onCopy={() => { void copyText(`${link.path} › ${link.frame}`, 'the frame path') }}
            />
          ))}
        </div>
      )}

      <SectionTitle title="Subtasks" count={subtaskProgress(ticket)} actionLabel="Add subtask" onAction={() => openInJira('Add the subtask in Jira; Refresh to see it here.')} />
      {ticket.subtasks.length > 0 && (
        <div class="bb-jira-board__subtasks">
          {subtaskColumns.filter((c) => c.length > 0).map((column, i) => (
            <div key={i} class="bb-jira-board__subtask-column">
              {column.map((s) => (
                <Checkbox
                  key={s.id}
                  label={s.label}
                  checked={s.done}
                  disabled={working}
                  onChange={(done) => { void write(rpc, MSG.subtask, { key, subtaskKey: s.id, done }, 'Updating the subtask…', 'Couldn’t update the subtask.') }}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {(busy.value ?? notice.value) && <p class="bb-jira-board__notice" role="status">{busy.value ?? notice.value}</p>}

      <ActivitySection ticket={ticket} />
    </section>
  )
}
