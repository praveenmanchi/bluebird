import { Comment, CommentComposer, SectionTitle, useRpc, type IconName } from '@shared/ui'
import { write } from '../actions'
import { MSG } from '../messages'
import { activityTab, busy, commentDraft, editingCommentId, me, notice, type ActivityTab } from '../state'
import type { ActivityEntry, Ticket } from '../types'
import { TabStrip } from './TabStrip'

const ACTIVITY_TABS: readonly ActivityTab[] = ['Comments', 'History', 'Work log']
const ACTIVITY_ICONS: Record<ActivityTab, IconName> = { Comments: 'ui-toolbar-comment', History: 'ui-toolbar-version-history', 'Work log': 'ui-prototype-time' }

const EMPTY: Record<ActivityTab, string> = {
  Comments: 'No comments yet.',
  History: 'No changes recorded yet.',
  'Work log': 'No work logged yet.',
}

/** Figma "Activity" section title, the Comments / History / Work log tabs and their entries. Comments are Jira writes. */
export function ActivitySection({ ticket }: { ticket: Ticket }) {
  const rpc = useRpc()
  const tab = activityTab.value
  const key = ticket.key
  const editing = editingCommentId.value

  async function submit(body: string) {
    const ok = editing
      ? await write(rpc, MSG.commentEdit, { key, id: editing, body }, 'Saving the comment…', 'Couldn’t save the comment.')
      : await write(rpc, MSG.comment, { key, body }, 'Posting the comment…', 'Couldn’t post the comment.')
    if (ok) { commentDraft.value = ''; editingCommentId.value = null }
  }

  const entries: Record<ActivityTab, readonly ActivityEntry[]> = {
    Comments: ticket.comments,
    History: ticket.history,
    'Work log': ticket.worklog,
  }
  const shown = entries[tab]
  const panelId = `bb-jira-activity-${ticket.key}`

  return (
    <>
      <SectionTitle title="Activity" showCount={false} showAction={false} />
      <TabStrip
        aria-label="Activity"
        aria-controls={panelId}
        options={ACTIVITY_TABS}
        icons={ACTIVITY_ICONS}
        value={tab}
        onChange={(v) => { activityTab.value = v }}
      />
      <div id={panelId} role="tabpanel" aria-label={tab} class="bb-jira-board__activity">
        {tab === 'Comments' && (
          <CommentComposer
            class="bb-jira-board__composer"
            initials={me.value.initials}
            value={commentDraft.value}
            onValueChange={(v) => { commentDraft.value = v }}
            onCancel={() => { commentDraft.value = ''; editingCommentId.value = null }}
            onSubmit={(body) => { if (body.trim() && busy.value === null) void submit(body) }}
            onAttachLink={() => { notice.value = 'Paste a link into the comment; Jira turns it into a link.' }}
            onAttachFile={() => { notice.value = 'File attachments are not supported by this version.' }}
          />
        )}
        {shown.length === 0 && <p class="bb-jira-board__empty">{EMPTY[tab]}</p>}
        {shown.map((entry) => (
          <Comment
            key={entry.id}
            author={entry.author.name}
            initials={entry.author.initials}
            time={entry.time}
            showActions={tab === 'Comments'}
            onReply={() => { commentDraft.value = `@${entry.author.name} ` }}
            onEdit={() => { commentDraft.value = entry.body; editingCommentId.value = entry.id }}
            onDelete={() => { void write(rpc, MSG.commentDelete, { key, id: entry.id }, 'Deleting the comment…', 'Couldn’t delete the comment.') }}
          >
            {entry.body}
          </Comment>
        ))}
      </div>
    </>
  )
}
