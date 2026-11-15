import { ChangeCount, ChangeRow, Input, MetaBadge, PublishEmptyState, SectionTitle, Spinner } from '@shared/ui'
import { requestSettings } from '@shared/navigation'
import { namesToFind, releaseLabel, shortDate } from '../../library'
import type { LibraryRelease } from '../../messages'
import { issueError, issueKey, release, releases, releasesPhase, releasesProblem, selectRelease } from '../../state'
import { ActionBar } from '../ActionBar'
import { Card } from '../cards'
import { OptionSelect } from '../OptionSelect'

export interface ChangesStepProps {
  /** Next: Impact — moves on and scans the file. */
  onImpact: () => void
  /** Read the team History again. */
  onReload: () => void
  /** Open the release's pull request or report. */
  onOpenUrl: (url: string) => void
}

const CHANGE_LABEL = { added: 'Added', modified: 'Modified', removed: 'Removed' } as const
/** Changed components listed before the rest are summed up. */
export const MAX_SHOWN_CHANGES = 8

function ReleasePicker() {
  const list = releases.value
  const current = release.value
  const labels = list.map(releaseLabel)
  return (
    <OptionSelect
      label="Library release"
      value={current ? releaseLabel(current) : 'Pick a release'}
      options={labels}
      onChange={(label) => { const picked = list[labels.indexOf(label)]; if (picked) selectRelease(picked.id) }}
    />
  )
}

function ReleaseCard({ r, onOpenUrl }: { r: LibraryRelease; onOpenUrl: ChangesStepProps['onOpenUrl'] }) {
  const counts = (['added', 'modified', 'removed'] as const).map((c) => [c, r.components.filter((x) => x.change === c).length] as const)
  const v = r.variables
  const varCount = v.added + v.modified + v.removed
  const shown = r.components.slice(0, MAX_SHOWN_CHANGES)
  return (
    <>
      <p class="bb-mcp-handoff__caption">
        {r.kind === 'changelog' ? 'Approved changelog' : 'Extraction'} by {r.by} · {shortDate(r.at)} · {r.file}{r.ticket ? ` · ${r.ticket}` : ''}
      </p>
      <div class="bb-mcp-handoff__options" aria-label="Component changes">
        {counts.map(([c, n]) => <ChangeCount key={c} type={c} count={n} />)}
        {r.link && <MetaBadge tone="neutral" role="link" tabIndex={0} onClick={() => onOpenUrl(r.link!)} onKeyDown={(e) => { if (e.key === 'Enter') onOpenUrl(r.link!) }}>Open release</MetaBadge>}
      </div>
      <SectionTitle title="Changed components" count={String(r.components.length)} showAction={false} />
      {shown.length ? (
        <ul class="bb-mcp-handoff__stack">
          {shown.map((c) => (
            <li key={`${c.change}:${c.name}`}>
              <ChangeRow kind="component" name={c.name} detail={c.note || CHANGE_LABEL[c.change]} change={c.change} showInclude={false} trailing={c.breaking ? <MetaBadge tone="danger">Breaking</MetaBadge> : undefined} />
            </li>
          ))}
        </ul>
      ) : <p class="bb-mcp-handoff__caption">No component changed in this release.</p>}
      {r.components.length > shown.length && <p class="bb-mcp-handoff__caption">+{r.components.length - shown.length} more components.</p>}
      {varCount > 0 && (
        <p class="bb-mcp-handoff__caption">
          {varCount} variable {varCount === 1 ? 'change arrives' : 'changes arrive'} with the token push, so screens need no code change for {varCount === 1 ? 'it' : 'them'}.
        </p>
      )}
    </>
  )
}

function summary(): string {
  const r = release.value
  if (releasesPhase.value === 'loading') return 'Reading the team History…'
  if (releasesProblem.value) return 'No releases to update from.'
  if (!r) return 'Pick a library release.'
  if (issueError.value) return issueError.value
  const n = namesToFind(r).length
  return n ? `${r.title} · ${n} ${n === 1 ? 'component' : 'components'} to look for in this file` : `${r.title} changed no component that a screen can use.`
}

/** Figma "MCP v3 · Library update · 1 Changes": pick a release from the team History and see what it changed. */
export function ChangesStep({ onImpact, onReload, onOpenUrl }: ChangesStepProps) {
  const r = release.value
  const phase = releasesPhase.value
  const ready = phase === 'done' && r !== null && namesToFind(r).length > 0 && issueError.value === null
  return (
    <>
      <div class="bb-mcp-handoff__panels">
        <Card label="Library release">
          <SectionTitle title="Library release" showCount={false} actionLabel="Refresh" onAction={onReload} />
          {phase === 'loading' && <div class="bb-mcp-handoff__loading" role="status"><Spinner tone="accent" size="sm" label="Reading the team History" /><span class="bb-mcp-handoff__caption">Reading the team History…</span></div>}
          {phase === 'failed' && <PublishEmptyState state="failed" title="Couldn’t read the team History" body={releasesProblem.value} actions={[{ label: 'Try again', variant: 'primary', onClick: onReload }]} />}
          {phase === 'done' && releasesProblem.value && (
            <PublishEmptyState state="not-connected" icon="ui-sidebar-libraries" title="Connect the team History" body={releasesProblem.value} actions={[{ label: 'Open Settings', variant: 'primary', onClick: requestSettings }]} />
          )}
          {phase === 'done' && !releasesProblem.value && releases.value.length === 0 && (
            <PublishEmptyState
              state="no-changes"
              icon="ui-sidebar-libraries"
              title="No library releases yet"
              body="A release shows up here once a changelog is approved in History, or an extraction is pushed. Publish one from the library file first."
              actions={[{ label: 'Refresh', variant: 'secondary', onClick: onReload }]}
            />
          )}
          {phase === 'done' && r && (
            <>
              <ReleasePicker />
              <ReleaseCard r={r} onOpenUrl={onOpenUrl} />
            </>
          )}
        </Card>
        {phase === 'done' && r && (
          <Card label="Jira">
            <Input
              label="Jira issue (optional)"
              value={issueKey.value}
              placeholder={r.ticket ?? 'BB-351'}
              helperText={issueError.value ?? `Goes into the branch name and the prompt.${r.ticket ? ` Leave it empty to use the release ticket ${r.ticket}.` : ''}`}
              error={issueError.value !== null}
              maxLength={40}
              spellcheck={false}
              autoComplete="off"
              onValueChange={(value) => { issueKey.value = value.toUpperCase() }}
            />
          </Card>
        )}
      </div>
      <ActionBar summary={summary()} primary={{ label: 'Next: Impact', disabled: !ready, onClick: onImpact }} />
    </>
  )
}
