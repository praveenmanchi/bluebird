import { useEffect, useRef } from 'preact/hooks'
import { Button, ChangeRow, MetaBadge, Notice, PublishEmptyState, SectionTitle, Spinner, useRpc } from '@shared/ui'
import { requestSettings } from '@shared/navigation'
import { loadVersions, showVersion } from '../actions'
import { cardDate, groupLabel, longDate } from '../format'
import type { FileVersion } from '../messages'
import { closeVersion, days, openVersion, searchText, versionDiff, versionDiffError, versionMatches, versionsError, versionsLoading, versionsResult } from '../state'
import { isAutosave } from '../versions'

const title = (v: FileVersion) => v.label || 'Autosave'

/** Figma "Versioning · 1 File versions": one History Entry card per version. */
function VersionCard({ version, onOpen }: { version: FileVersion; onOpen: () => void }) {
  const auto = isAutosave(version)
  return (
    <article class="bb-history-card" aria-label={`${auto ? 'Autosave' : 'Version'}: ${title(version)}`}>
      <div class="bb-history-card__header">
        <div class="bb-history-card__titles">
          <span class="bb-history-card__badges"><MetaBadge tone={auto ? 'neutral' : 'accent'}>{auto ? 'Autosave' : 'Version'}</MetaBadge></span>
          <h3 class="bb-history-card__title">{title(version)}</h3>
        </div>
        <div class="bb-history-card__meta">
          <div class="bb-history-card__when"><time class="bb-history-card__date" dateTime={version.at}>{cardDate(version.at)}</time></div>
          <div class="bb-history-card__person"><span class="bb-history-card__name">{version.by}</span></div>
        </div>
      </div>
      <p class="bb-history-card__what">{version.description || (auto ? 'Figma autosave' : 'Named version')}</p>
      <div class="bb-history-card__footer">
        <span />
        <Button variant="secondary" trailingIcon="ui-prototype-navigate-to" onClick={onOpen} aria-label={`View details: ${title(version)}`}>View details</Button>
      </div>
    </article>
  )
}

const KIND_PREVIEW = 'component' as const

/** Figma "Versioning · 2 Version details": who saved it, what it was compared with, and what changed. */
function VersionDialog({ version, previous, file }: { version: FileVersion; previous: FileVersion | null; file: string }) {
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    root.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeVersion() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])
  const diff = versionDiff.value
  return (
    <div class="bb-changelog" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) closeVersion() }}>
      <div ref={root} class="bb-changelog__panel" role="dialog" aria-modal="true" aria-label={title(version)} tabIndex={-1}>
        <div class="bb-history__header bb-changelog__bar">
          <SectionTitle title={title(version)} showCount={false} showAction={false} />
          <MetaBadge tone={isAutosave(version) ? 'neutral' : 'accent'}>{isAutosave(version) ? 'Autosave' : 'Version'}</MetaBadge>
        </div>
        <div class="bb-changelog__body">
          <dl class="bb-history__facts" aria-label="Version">
            <div class="bb-history__fact"><dt class="bb-history__hint">File</dt><dd>{file}</dd></div>
            <div class="bb-history__fact"><dt class="bb-history__hint">Saved by</dt><dd>{version.by} · {longDate(version.at)}</dd></div>
            <div class="bb-history__fact"><dt class="bb-history__hint">Compared with</dt><dd>{previous ? `${title(previous)} · ${cardDate(previous.at)}` : 'Nothing earlier in this range'}</dd></div>
          </dl>
          {version.description && <p class="bb-history__hint">“{version.description}”</p>}
          {versionDiffError.value && <Notice tone="error" title="Couldn’t compare this version">{versionDiffError.value}</Notice>}
          {!diff && !versionDiffError.value && <div class="bb-history__loading"><Spinner tone="accent" size="lg" label="Comparing with the version before" /></div>}
          {diff && (
            <section class="bb-changelog__list" aria-label="Changes">
              <SectionTitle title="Changes" showCount count={diff.changes.length} showAction={false} />
              {diff.changes.map((c, i) => <ChangeRow key={i} kind={KIND_PREVIEW} name={c.name} detail={`${c.what} · ${c.detail}`} change={c.kind} showInclude={false} />)}
              <p class="bb-history__hint">{diff.changes.length || !previous ? diff.note : `No pages, frames or components were added, deleted or renamed. ${diff.note}`}</p>
            </section>
          )}
          <div class="bb-history__actions bb-changelog__actions">
            <Button variant="primary" onClick={closeVersion}>Close</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Versioning: the open file's Figma versions, grouped by day, read when the filter is picked. */
export function VersionsView({ now }: { now: Date }) {
  const rpc = useRpc()
  useEffect(() => { if (!versionsResult.value) void loadVersions(rpc) }, [])
  const r = versionsResult.value
  if (versionsError.value) {
    return <PublishEmptyState state="failed" title="Couldn’t read this file’s versions" body={versionsError.value} actions={[{ label: 'Try again', variant: 'primary', onClick: () => { void loadVersions(rpc) } }]} />
  }
  if (!r || versionsLoading.value) return <div class="bb-history__loading"><Spinner tone="accent" size="lg" label="Reading this file’s versions" /></div>
  if (r.problem) {
    return <PublishEmptyState state="not-connected" title="Add a Figma REST key" body={`${r.problem} Versioning shows who saved each version of the file you have open and what changed.`} actions={r.needsSettings ? [{ label: 'Open Settings', variant: 'primary', onClick: requestSettings }] : []} />
  }
  if (!r.versions.length) return <PublishEmptyState state="first-release" title="No versions yet" body={`Nobody saved a version of ${r.file} in the last ${days.value} days. Figma autosaves while people edit.`} actions={[]} />
  const matches = versionMatches.value
  const query = searchText.value.trim()
  if (matches && !matches.length) {
    return <PublishEmptyState state="first-release" title={`No version matches ${query}`} body={`No version of ${r.file} in the last ${days.value} days has “${query}” in its name, description or author. The changes inside a version are not searched — open a version to see them.`} actions={[]} />
  }
  const groups: { label: string; versions: FileVersion[] }[] = matches ? [{ label: `Results for ${query}`, versions: [...matches] }] : []
  for (const v of matches ? [] : r.versions) {
    const label = groupLabel(v.at, now)
    const last = groups[groups.length - 1]
    if (last?.label === label) last.versions.push(v)
    else groups.push({ label, versions: [v] })
  }
  const open = openVersion.value
  const index = open ? r.versions.findIndex((v) => v.id === open.id) : -1
  return (
    <>
      <p class="bb-history__hint">{matches ? `Versions of ${r.file} whose name, description or author match. The changes inside a version are not searched.` : `Every version of ${r.file}, the file you have open: who saved it and what changed since the version before.`}</p>
      {groups.map((g) => (
        <section key={g.label} class="bb-history__day" aria-label={g.label}>
          <SectionTitle title={g.label} showCount count={g.versions.length} showAction={false} />
          <ul class="bb-history__list">
            {g.versions.map((v) => {
              const previous = r.versions[r.versions.indexOf(v) + 1] ?? null
              return <li key={v.id}><VersionCard version={v} onOpen={() => { void showVersion(rpc, v, previous) }} /></li>
            })}
          </ul>
        </section>
      ))}
      {open && index >= 0 && <VersionDialog version={open} previous={r.versions[index + 1] ?? null} file={r.file} />}
    </>
  )
}
