import { useEffect, useRef } from 'preact/hooks'
import { Button, ChangeRow, Checkbox, Chip, Input, MetaBadge, Notice, SectionTitle, Spinner, TextArea, useRpc } from '@shared/ui'
import type { Change } from '@shared/design/types'
import { canSubmit, generateChangelog, submitChangelog } from '../actions'
import { countLine } from '../changelog'
import { isTicket } from '../messages'
import {
  changelogCard, changelogContext, changelogDraft, changelogError, changelogNotes, changelogPhase, changelogTicket, changelogTitle, closeChangelog, knownTickets,
} from '../state'

/** Rows shown per list in the preview; the entry keeps all of them. */
export const PREVIEW_ROWS = 8

function ChangeList({ title, changes }: { title: string; changes: readonly Change[] }) {
  if (!changes.length) return null
  return (
    <section class="bb-changelog__list" aria-label={title}>
      <SectionTitle title={title} showCount count={changes.length} showAction={false} />
      {changes.slice(0, PREVIEW_ROWS).map((c) => (
        <ChangeRow key={c.id} kind={c.preview} name={c.name} detail={c.detail} change={c.kind} swatch={c.swatch} showInclude={false} />
      ))}
      {changes.length > PREVIEW_ROWS && <p class="bb-history__hint">And {changes.length - PREVIEW_ROWS} more. All of them are saved with the changelog.</p>}
    </section>
  )
}

function Where() {
  const c = changelogContext.value
  if (!c) return null
  return (
    <dl class="bb-history__facts" aria-label="Where you are">
      <div class="bb-history__fact"><dt class="bb-history__hint">File</dt><dd>{c.file}</dd></div>
      <div class="bb-history__fact"><dt class="bb-history__hint">Page</dt><dd>{c.page}</dd></div>
      <div class="bb-history__fact"><dt class="bb-history__hint">Compared with</dt><dd>{c.main ?? 'Nothing yet'}</dd></div>
      <div class="bb-history__fact"><dt class="bb-history__hint">Changed by</dt><dd>{c.user}</dd></div>
    </dl>
  )
}

function Ticket() {
  const value = changelogTicket.value
  const valid = value.trim() === '' || isTicket(value.trim())
  return (
    <div class="bb-changelog__field">
      <Input label="Jira ticket" icon="jira" value={value} placeholder="BB-342" error={!valid} helperText={valid ? 'Optional. Pick one the team already used, or type the key.' : 'A Jira key looks like BB-342.'} onValueChange={(v) => { changelogTicket.value = v.toUpperCase() }} />
      {knownTickets.value.length > 0 && (
        <div class="bb-changelog__chips" role="group" aria-label="Tickets the team used">
          {knownTickets.value.map((t) => <Chip key={t} showIcon={false} selected={t === value.trim()} onClick={() => { changelogTicket.value = t }}>{t}</Chip>)}
        </div>
      )}
    </div>
  )
}

/**
 * "New changelog" pop-up (History › +): says where you are, compares the open
 * branch with its main file, previews what changed and submits it for review.
 * Figma "History · 600 · Changelog generator" (40002732:11169): a title bar
 * (40002734:22605) over the body (40002734:22587), centred in the tab.
 */
export function ChangelogDialog() {
  const rpc = useRpc()
  const root = useRef<HTMLDivElement>(null)
  const phase = changelogPhase.value
  useEffect(() => {
    root.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && changelogPhase.value !== 'submitting') closeChangelog() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const context = changelogContext.value
  const draft = changelogDraft.value
  const busy = phase === 'submitting'
  const variables = draft?.changes.filter((c) => c.subject === 'variable') ?? []
  const components = draft?.changes.filter((c) => c.subject === 'component') ?? []

  return (
    <div class="bb-changelog" role="presentation" onClick={(e) => { if (e.target === e.currentTarget && !busy) closeChangelog() }}>
      <div ref={root} class="bb-changelog__panel" role="dialog" aria-modal="true" aria-label="New changelog" tabIndex={-1}>
        <div class="bb-history__header bb-changelog__bar">
          <SectionTitle title="New changelog" showCount={false} showAction={false} />
          {context?.main && <MetaBadge tone="success">Branch</MetaBadge>}
        </div>
        <div class="bb-changelog__body">

        {phase === 'checking' && <div class="bb-history__loading"><Spinner tone="accent" size="lg" label="Checking this file" /></div>}
        {phase === 'generating' && (
          <div class="bb-changelog__busy">
            <Spinner tone="accent" size="lg" label="Comparing with the main file" />
            <p class="bb-history__hint">Comparing {context?.file} with {context?.main}. A large library takes a minute.</p>
          </div>
        )}

        {phase === 'ready' && (
          <>
            <p class="bb-history__body">Compares this branch with its main file and lists every variable and component that was added, updated or deleted.</p>
            <Where />
            {context?.problem && <Notice tone="info" title="Nothing to compare with">{context.problem}</Notice>}
            {changelogError.value && <Notice tone="error" title="Couldn’t generate the changelog">{changelogError.value}</Notice>}
          </>
        )}

        {(phase === 'preview' || busy) && draft && (
          <>
            <Where />
            <div class="bb-history__badges">
              <MetaBadge tone="neutral" meta={countLine(draft.changes, 'variable') || 'No changes'}>Variables</MetaBadge>
              <MetaBadge tone="neutral" meta={countLine(draft.changes, 'component') || 'No changes'}>Components</MetaBadge>
            </div>
            {draft.warnings.length > 0 && <Notice tone="info" title="Not everything was compared">{draft.warnings.join(' ')}</Notice>}
            {!draft.changes.length && <Notice tone="info" title="No changes found">This branch has the same variables and components as {draft.context.main}. You can still submit a note.</Notice>}
            <ChangeList title="Variable changes" changes={variables} />
            <ChangeList title="Component changes" changes={components} />
            <Input label="Title" value={changelogTitle.value} error={!changelogTitle.value.trim()} disabled={busy} onValueChange={(v) => { changelogTitle.value = v.slice(0, 160) }} />
            <TextArea label="What changed and why" value={changelogNotes.value} placeholder="Layout tweaks, spacing or anything the compare can’t see." disabled={busy} onValueChange={(v) => { changelogNotes.value = v.slice(0, 2000) }} />
            <Ticket />
            <Checkbox checked={changelogCard.value} disabled={busy} label="Add the changelog card to this page" onChange={(v) => { changelogCard.value = v }} />
            {changelogError.value && <Notice tone="error" title="Not submitted">{changelogError.value}</Notice>}
          </>
        )}

        <div class="bb-history__actions bb-changelog__actions">
          <Button variant="secondary" disabled={busy} onClick={closeChangelog}>Cancel</Button>
          {phase === 'ready' && <Button variant="primary" disabled={!context?.main} onClick={() => { void generateChangelog(rpc) }}>Generate changelog</Button>}
          {(phase === 'preview' || busy) && <Button variant="primary" loading={busy} disabled={!canSubmit()} onClick={() => { void submitChangelog(rpc) }}>Submit for review</Button>}
        </div>
        </div>
      </div>
    </div>
  )
}
