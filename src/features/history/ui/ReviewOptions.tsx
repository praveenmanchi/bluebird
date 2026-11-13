import { useEffect, useRef, useState } from 'preact/hooks'
import { Checkbox, Comment, ConnectionRow, Dropdown, DropdownMenu, FigmaLinkCard, Input, MenuItem, SectionTitle, SegmentedControl, Toggle } from '@shared/ui'
import { requestSettings } from '@shared/navigation'
import { copyText } from '@shared/clipboard'
import { initials } from '../format'
import type { ReviewChannels, TicketOption } from '../messages'

/** Figma "Changelog · 3b Pick a ticket (menu open)": a Dropdown of open tickets, "Type a number instead" last. */
function TicketSelect({ value, tickets, onChange, onType, disabled }: { value: string; tickets: readonly TicketOption[]; onChange: (key: string) => void; onType: () => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false) } }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey, true)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey, true) }
  }, [open])
  const picked = tickets.find((t) => t.key === value)
  return (
    <div ref={root} class="bb-history__range bb-changelog__select">
      <Dropdown aria-label="Jira ticket" value={picked ? `${picked.key} · ${picked.title}` : undefined} placeholder="Pick a ticket…" open={open} disabled={disabled} onOpenChange={setOpen} />
      {open && (
        <DropdownMenu class="bb-history__menu" aria-label="Open tickets">
          {tickets.map((t) => <MenuItem key={t.key} label={`${t.key} · ${t.title}`} count={t.status} selected={t.key === value} onSelect={() => { onChange(t.key); setOpen(false) }} />)}
          <MenuItem label="Type a number instead" onSelect={() => { onType(); setOpen(false) }} />
        </DropdownMenu>
      )}
    </div>
  )
}

export interface TicketFieldProps {
  mode: 'pick' | 'type'
  value: string
  valid: boolean
  tickets: readonly TicketOption[]
  /** Why tickets can't be listed (Jira not connected, a failed read). */
  problem?: string
  disabled?: boolean
  onModeChange: (mode: 'pick' | 'type') => void
  onChange: (key: string) => void
}

/** Figma "Jira ticket": Pick a ticket / Type a number, then the Dropdown or the key field. */
export function TicketField({ mode, value, valid, tickets, problem, disabled, onModeChange, onChange }: TicketFieldProps) {
  return (
    <div class="bb-changelog__field">
      <div class="bb-history__header">
        <SectionTitle title="Jira ticket" showCount={false} showAction={false} />
        <SegmentedControl aria-label="Ticket source" options={[{ value: 'pick', label: 'Pick a ticket' }, { value: 'type', label: 'Type a number' }]} value={mode} disabled={disabled} onChange={onModeChange} />
      </div>
      {mode === 'pick' ? (
        <>
          <TicketSelect value={value} tickets={tickets} disabled={disabled || !tickets.length} onChange={onChange} onType={() => onModeChange('type')} />
          <p class="bb-history__hint">{problem ?? (tickets.length ? 'Open tickets from the Jira project in Settings. Switch to Type a number to enter any key.' : 'No open tickets in the Jira project. Switch to Type a number.')}</p>
        </>
      ) : (
        <Input
          label="Ticket number" icon="jira" value={value} placeholder="BB-351" error={!valid} disabled={disabled}
          helperText={valid ? 'Optional. Any key from your Jira project, like BB-351.' : 'A Jira key looks like BB-342.'}
          onValueChange={(v) => onChange(v.toUpperCase())}
        />
      )}
    </div>
  )
}

export interface JiraCommentProps {
  ticket: string
  /** "Post the changes to BB-342 as a Jira comment". */
  label: string
  checked: boolean
  author: string
  time: string
  /** The comment text without the branch link (that shows as the link card). */
  body: string
  branch: string
  disabled?: boolean
  onChange: (on: boolean) => void
  onOpenUrl: (url: string) => void
}

/** Figma "Jira update": the checkbox and a preview of the comment, with the Figma branch as a link card. */
export function JiraComment({ ticket, label, checked, author, time, body, branch, disabled, onChange, onOpenUrl }: JiraCommentProps) {
  return (
    <div class="bb-changelog__field" aria-label={`Jira comment on ${ticket}`}>
      <Checkbox checked={checked} disabled={disabled} label={label} onChange={onChange} />
      {checked && (
        <div class="bb-history__card bb-changelog__comment">
          <Comment author={author} initials={initials(author)} time={time} showActions={false}>
            <span class="bb-changelog__comment-body">{body}</span>
          </Comment>
          {branch && <FigmaLinkCard frame="Figma branch" path={branch.replace(/^https:\/\/www\.figma\.com\//, 'figma.com/')} onOpen={() => onOpenUrl(branch)} onCopy={() => { void copyText(branch) }} />}
        </div>
      )}
    </div>
  )
}

export interface NotifyReviewersProps {
  channels: ReviewChannels
  teams: boolean
  outlook: boolean
  disabled?: boolean
  onChange: (next: { teams: boolean; outlook: boolean }) => void
}

const CHANNELS = [['teams', 'Microsoft Teams', 'Design system channel · Teams webhook'], ['outlook', 'Outlook', 'Reviewers · Outlook webhook']] as const

/** Figma "Notify reviewers": Teams and Outlook from Settings › Notifications, each switched on or off. */
export function NotifyReviewers({ channels, teams, outlook, disabled, onChange }: NotifyReviewersProps) {
  const on = { teams, outlook }
  return (
    <section class="bb-changelog__field" aria-label="Notify reviewers">
      <SectionTitle title="Notify reviewers" showCount count={CHANNELS.filter(([k]) => channels[k]).length} showAction actionLabel="Settings" onAction={requestSettings} />
      {CHANNELS.map(([key, name, detail]) => (
        <div key={key} class="bb-changelog__channel">
          <ConnectionRow name={name} status={channels[key] ? 'good' : 'issue'} detail={channels[key] ? detail : 'Not set up in Settings › Notifications'} showAction={false} />
          <Toggle label={`Notify ${name}`} checked={channels[key] && on[key]} disabled={disabled || !channels[key]} onChange={(v) => onChange({ ...on, [key]: v })} />
        </div>
      ))}
      <p class="bb-history__hint">Reviewers get the changelog and a link to approve it when you press Submit for review.</p>
    </section>
  )
}
