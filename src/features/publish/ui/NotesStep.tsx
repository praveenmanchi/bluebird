import { useState } from 'preact/hooks'
import { ChangelogNote, ChangeRow, Input, LinkButton, MetaBadge, SectionTitle, VersionOption } from '@shared/ui'
import { countKinds } from '../diff'
import { suggestionReason, versionOptions } from '../semver'
import {
  bump, chosenBump, currentVersion, editNote, editedNotes, editing, firstRelease, includedChanges, nextVersion, noteFor,
  step, suggestedBump, title, toggleIncluded,
} from '../state'
import type { Change } from '../types'
import { ActionBar } from './ActionBar'
import { plural } from './format'

const KIND_BADGES: ReadonlyArray<[Change['kind'], string, 'success' | 'accent' | 'danger' | 'warning']> = [
  ['added', 'added', 'success'], ['modified', 'modified', 'accent'], ['removed', 'removed', 'danger'], ['deprecated', 'deprecated', 'warning'],
]

/** "3 added · 7 modified …" badges for the included changes. */
export function KindCounts({ changes }: { changes: readonly Change[] }) {
  const counts = countKinds(changes)
  return (
    <div class="bb-publish__counts">
      {KIND_BADGES.filter(([kind]) => counts[kind] > 0).map(([kind, label, tone]) => <MetaBadge key={kind} tone={tone}>{counts[kind]} {label}</MetaBadge>)}
    </div>
  )
}

/** Compact list of what ships, without the expandable details. */
export function IncludedList({ changes }: { changes: readonly Change[] }) {
  return (
    <ul class="bb-publish__list" aria-label="Changes in this release">
      {changes.map((c) => (
        <li key={c.id}>
          <ChangeRow kind={c.preview} name={c.name} detail={c.detail} change={c.kind} swatch={c.swatch} included onIncludedChange={(on) => toggleIncluded(c.id, on)} />
        </li>
      ))}
    </ul>
  )
}

/** How many changelog notes show before "Show N more notes" (Figma Release notes / Final review). */
export const NOTE_PAGE_SIZE = 2

export function NoteList({ changes, onEdit }: { changes: readonly Change[]; onEdit?: (id: string) => void }) {
  const [showAll, setShowAll] = useState(false)
  // Keep the note being edited on screen even when it sits past the fold.
  const shown = showAll ? changes : changes.filter((c, i) => i < NOTE_PAGE_SIZE || c.id === editing.value)
  const hidden = changes.length - shown.length
  return (
    <>
      <ul class="bb-publish__list" aria-label="Changelog">
        {shown.map((c) => {
          const isEditing = editing.value === c.id
          return (
            <li key={c.id}>
              <ChangelogNote
                state={c.id in editedNotes.value ? 'edited' : 'auto'}
                change={c.kind}
                title={c.name}
                note={noteFor(c)}
                editing={isEditing}
                actionLabel={isEditing ? 'Done' : 'Edit'}
                onAction={() => onEdit ? onEdit(c.id) : (editing.value = isEditing ? null : c.id)}
                onNoteInput={(text) => editNote(c.id, text)}
              />
            </li>
          )
        })}
      </ul>
      {hidden > 0 && <LinkButton class="bb-publish__more" onClick={() => setShowAll(true)}>Show {plural(hidden, 'more note', 'more notes')}</LinkButton>}
    </>
  )
}

/** Changelog "Regenerate": drop every edit and redraft each note from the diff. */
function regenerateNotes(): void {
  editedNotes.value = {}
  editing.value = null
}

/** Step 2 — Figma "Publish v2 · 3 Release notes": version, title, changelog. */
export function NotesStep() {
  const picked = includedChanges.value
  const edited = picked.filter((c) => c.id in editedNotes.value).length
  return (
    <>
      <div class="bb-publish__scroll">
        <section class="bb-publish__card" aria-label="Release notes">
          <SectionTitle title="Version" showCount={false} showAction={false} />
          <div class="bb-publish__versions" role="radiogroup" aria-label="Version">
            {versionOptions(currentVersion.value).map((o) => (
              <VersionOption
                key={o.bump}
                name="bb-publish-version"
                bump={o.bump}
                version={o.version}
                hint={o.hint}
                suggested={o.bump === suggestedBump.value}
                selected={o.bump === bump.value}
                onSelect={() => { chosenBump.value = o.bump }}
              />
            ))}
          </div>
          <p class="bb-publish__hint">{suggestionReason(picked, firstRelease.value, currentVersion.value)}</p>
          <Input label="Release title" value={title.value} placeholder={nextVersion.value} onValueChange={(v) => { title.value = v }} />
          <SectionTitle title="Changelog" showCount count={picked.length} showAction={edited > 0} actionLabel="Regenerate" onAction={regenerateNotes} />
          <NoteList changes={picked} />
        </section>
        <section class="bb-publish__card" aria-label="In this release">
          <SectionTitle title="In this release" showCount count={picked.length} showAction={false} />
          <KindCounts changes={picked} />
          <IncludedList changes={picked} />
        </section>
      </div>
      <ActionBar
        summary={`${nextVersion.value} · ${plural(picked.length, 'change')} · ${edited} edited, ${picked.length - edited} drafted from the diff`}
        secondary={{ label: 'Back', onClick: () => { editing.value = null; step.value = 0 } }}
        primary={{ label: 'Next: Final review', disabled: picked.length === 0, onClick: () => { editing.value = null; step.value = 2 } }}
      />
    </>
  )
}
