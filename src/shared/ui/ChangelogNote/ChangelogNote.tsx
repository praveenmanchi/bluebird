import type { JSX } from 'preact'
import { MetaBadge, type MetaBadgeTone } from '../MetaBadge/MetaBadge'
import { LinkButton } from '../LinkButton/LinkButton'
import { TextArea } from '../TextArea/TextArea'
import './ChangelogNote.css'

/** Local copy of the Publish change kind (the shared one lives with ChangeRow). */
export type ChangeKind = 'added' | 'modified' | 'removed' | 'deprecated'
export type ChangelogNoteState = 'auto' | 'edited'

/** The "Change" Meta Badge Label + Tone per change kind (Figma draws Modified / Accent). */
const CHANGE_BADGE: Record<ChangeKind, { label: string; tone: MetaBadgeTone }> = {
  added: { label: 'Added', tone: 'success' },
  modified: { label: 'Modified', tone: 'accent' },
  removed: { label: 'Removed', tone: 'danger' },
  deprecated: { label: 'Deprecated', tone: 'warning' },
}

/** The Source line and Link Button label each State draws. */
const STATE_COPY: Record<ChangelogNoteState, { source: string; action: string }> = {
  auto: { source: 'Drafted from the diff · edit to add context', action: 'Edit' },
  edited: { source: 'Edited by you · shows on the site changelog', action: 'Done' },
}

export interface ChangelogNoteProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Figma "State": Auto (drafted from the diff) / Edited (written by the user, selected border). */
  state?: ChangelogNoteState
  /** Figma "Title" — the changed token or component path. */
  title?: string
  /** Figma "Note" — the changelog sentence. */
  note?: string
  /** The "Change" Meta Badge: Added / Modified / Removed / Deprecated. */
  change?: ChangeKind
  /** Overrides the State's Source line. */
  source?: string
  /** Overrides the Action Link Button label (Edit for Auto, Done for Edited or while editing). */
  actionLabel?: string
  /** Fires when the Action link is pressed (toggle editing from here). */
  onAction?: () => void
  /** Renders the Note in a TextArea; the action reads "Done". Not a Figma variant. */
  editing?: boolean
  /** Fired with the new note on every keystroke while editing. */
  onNoteInput?: (note: string) => void
}

/** Figma "Changelog Note" (40000345:8607): one release-note line — change badge, title, note and where it came from. */
export function ChangelogNote({
  state = 'auto',
  title = 'button/bg/primary',
  note = 'Primary button background darkened from #0C8CE9 to #0560A3 so white labels pass AA (4.9:1).', // allow-raw: sample content mirroring the Figma component, shown as data
  change = 'modified',
  source,
  actionLabel,
  onAction,
  editing = false,
  onNoteInput,
  class: cls,
  ...rest
}: ChangelogNoteProps) {
  const copy = STATE_COPY[state]
  const badge = CHANGE_BADGE[change]
  return (
    <div {...rest} class={`bb-changelog-note ${cls ?? ''}`} data-state={state} data-editing={editing || undefined} data-change={change}>
      <div class="bb-changelog-note__header">
        <MetaBadge tone={badge.tone} class="bb-changelog-note__change">{badge.label}</MetaBadge>
        <span class="bb-changelog-note__title">{title}</span>
        <LinkButton class="bb-changelog-note__action" onClick={onAction}>
          {actionLabel ?? (editing ? 'Done' : copy.action)}
        </LinkButton>
      </div>
      {editing
        ? <TextArea class="bb-changelog-note__field" aria-label={`Changelog note for ${title}`} value={note} onValueChange={onNoteInput} />
        : <p class="bb-changelog-note__note">{note}</p>}
      <span class="bb-changelog-note__source">{source ?? copy.source}</span>
    </div>
  )
}
