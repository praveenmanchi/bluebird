import {
  Button, ChangeItem, LinkButton, PIPELINE_DEFAULT_NODES, Pipeline, PublishEmptyState, SectionTitle, SegmentTab, Spinner,
  type PipelineNodeProps, type PipelineNodes, type PublishEmptyStateAction,
} from '@shared/ui'
import { requestSettings } from '@shared/navigation'
import {
  changes, expanded, extractError, extractPhase, filter, included, result, setAllIncluded, showAll, status, statusError,
  step, toggleIncluded, type ChangeFilter,
} from '../state'
import { ActionBar } from './ActionBar'
import { brandValues, plural, relativeTime, rowProps } from './format'

/** How many changes show before "Show N more". */
export const PAGE_SIZE = 5

export interface ReviewStepProps {
  onExtract: () => void
  onRetryStatus: () => void
}

function pipelineNodes(): PipelineNodes {
  const s = status.value, r = result.value, phase = extractPhase.value
  const figmaNode: Partial<PipelineNodeProps> =
    phase === 'extracting' ? { status: 'running', meta: 'Reading the file…' }
      : phase === 'failed' ? { status: 'error', meta: 'Extract failed' }
        : r && r.counts.variables + r.counts.components === 0 ? { status: 'idle', meta: 'Nothing to publish' }
          : r ? { status: 'done', meta: r.changes.length ? `${plural(r.changes.length, 'change')} found` : 'No changes' }
            : { status: 'idle', meta: 'Not extracted yet' }
  const repoNode: Partial<PipelineNodeProps> = !s ? { status: 'idle', meta: 'Checking…' }
    : s.repo.connected ? { status: 'done', meta: `${s.repo.repo.split('/').pop()} · ${s.repo.branch}` }
      : { status: 'idle', meta: 'Not connected' }
  const siteNode: Partial<PipelineNodeProps> = s?.baseline ? { status: 'done', meta: `${s.baseline.version} live` } : { status: 'idle', meta: 'Not published yet' }
  const [a, b, c] = PIPELINE_DEFAULT_NODES
  return [{ ...a, ...figmaNode }, { ...b, ...repoNode }, { ...c, ...siteNode }]
}

function StartState({ onExtract, onRetryStatus }: ReviewStepProps) {
  const s = status.value
  if (statusError.value) {
    return <PublishEmptyState state="failed" title="Couldn’t read this file’s releases" body={statusError.value} actions={[{ label: 'Try again', variant: 'primary', onClick: onRetryStatus }]} />
  }
  if (!s) return <div class="bb-publish__loading"><Spinner tone="accent" size="lg" label="Checking this file’s last release" /></div>
  if (extractPhase.value === 'extracting') {
    return <div class="bb-publish__loading" role="status"><Spinner tone="accent" size="lg" label="Reading variables and components" /><span>Reading variables and components…</span></div>
  }
  if (extractPhase.value === 'failed') {
    return <PublishEmptyState state="failed" title="Extract failed" body={extractError.value} actions={[{ label: 'Open settings', variant: 'secondary', onClick: requestSettings }, { label: 'Try again', variant: 'primary', onClick: onExtract }]} />
  }
  if (!s.repo.connected) {
    const actions: PublishEmptyStateAction[] = [{ label: 'Extract anyway', variant: 'secondary', onClick: onExtract }, { label: 'Connect GitHub', variant: 'primary', onClick: requestSettings }]
    const body = `${s.repo.problem ?? 'Connect a repository in Settings › GitHub'}. Bluebird commits the tokens, release notes and changelog there and opens a pull request; your CI builds the site.`
    return <PublishEmptyState state="not-connected" body={body} actions={actions} />
  }
  if (!s.baseline) return <PublishEmptyState state="first-release" actions={[{ label: 'Run first extract', variant: 'primary', onClick: onExtract }]} />
  return (
    <PublishEmptyState
      state="ready-to-extract"
      body={`Compares the variables, styles and components in this file with ${s.baseline.version}, the last published release. Nothing is committed until you publish.`}
      actions={[{ label: 'Run extract', variant: 'primary', onClick: onExtract }]}
    />
  )
}

const FILTERS: ReadonlyArray<[ChangeFilter, string]> = [['all', 'All'], ['variable', 'Variables'], ['component', 'Components']]
const LIST_ID = 'bb-publish-changes'

function pickFilter(id: ChangeFilter): void {
  filter.value = id
  showAll.value = false
}

/** Arrow keys move between the filter tabs (only the selected one is in the Tab order). */
function onFilterKey(e: KeyboardEvent): void {
  const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
  if (!delta) return
  e.preventDefault()
  const i = FILTERS.findIndex(([id]) => id === filter.value)
  const next = FILTERS[(i + delta + FILTERS.length) % FILTERS.length]![0]
  pickFilter(next)
  const tabs = (e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[role="tab"]')
  tabs[FILTERS.findIndex(([id]) => id === next)]?.focus()
}

function ChangeList({ onExtract }: Pick<ReviewStepProps, 'onExtract'>) {
  const r = result.value!
  const all = changes.value
  if (r.counts.variables + r.counts.components === 0) {
    return <PublishEmptyState state="empty-file" actions={[{ label: 'Run extract again', variant: 'secondary', onClick: onExtract }]} />
  }
  if (!all.length) {
    const since = r.baseline ? ` since ${r.baseline.version}` : ''
    return <PublishEmptyState state="no-changes" body={`No variable or component changes${since}. Edits made in this file show up the next time you run an extract.`} actions={[{ label: 'Run extract again', variant: 'secondary', onClick: onExtract }]} />
  }
  const shown = filter.value === 'all' ? all : all.filter((c) => c.subject === filter.value)
  const visible = showAll.value ? shown : shown.slice(0, PAGE_SIZE)
  const hidden = shown.length - visible.length
  const allIncluded = included.value.size === all.length
  const count = (f: ChangeFilter) => f === 'all' ? all.length : all.filter((c) => c.subject === f).length
  const vars = count('variable'), comps = count('component')

  return (
    <>
      <div class="bb-publish__extract">
        <span>
          Extracted {relativeTime(r.extractedAt)} · {r.baseline ? `compared with ${r.baseline.version}` : 'first release'} · {plural(vars, 'variable')}, {plural(comps, 'component')} changed
        </span>
        <Button variant="secondary" onClick={onExtract}>Re-run extract</Button>
      </div>
      <SectionTitle
        title={r.baseline ? `Changes since ${r.baseline.version}` : 'Everything in this file'}
        showCount
        count={all.length}
        showAction
        actionLabel={allIncluded ? 'Clear all' : 'Select all'}
        onAction={() => setAllIncluded(!allIncluded)}
      />
      <div class="bb-publish__filters" role="tablist" aria-label="Filter changes" onKeyDown={onFilterKey}>
        {FILTERS.map(([id, label]) => (
          <SegmentTab key={id} selected={filter.value === id} aria-controls={LIST_ID} onClick={() => pickFilter(id)}>
            {label} {count(id)}
          </SegmentTab>
        ))}
      </div>
      <ul id={LIST_ID} class="bb-publish__list" aria-label="Changes">
        {visible.map((change) => (
          <li key={change.id}>
            <ChangeItem
              expanded={expanded.value === change.id}
              onToggle={() => { expanded.value = expanded.value === change.id ? null : change.id }}
              row={rowProps(change, included.value.has(change.id), (on) => toggleIncluded(change.id, on))}
              brandValues={brandValues(change)}
              usedIn={change.usedIn}
              source={change.source}
            />
          </li>
        ))}
      </ul>
      {hidden > 0 && <LinkButton class="bb-publish__more" onClick={() => { showAll.value = true }}>Show {plural(hidden, 'more change', 'more changes')}</LinkButton>}
    </>
  )
}

function summary(): string {
  const r = result.value
  if (extractPhase.value === 'extracting') return 'Reading the file…'
  if (!r) return status.value?.baseline ? `Run an extract to see what changed since ${status.value.baseline.version}.` : 'Run an extract to see what this file would publish.'
  if (!r.changes.length) return 'Nothing to publish yet.'
  return `${included.value.size} of ${r.changes.length} changes selected for the next release`
}

/** Step 1 — Figma "Publish v2 · Review changes" (Extract / Changes / Details and their empty + error states). */
export function ReviewStep({ onExtract, onRetryStatus }: ReviewStepProps) {
  const listed = extractPhase.value === 'done' && !!result.value
  const canContinue = listed && included.value.size > 0
  // Figma "Changes" / "Details" drop the Publish route once there is a list to review;
  // the start, empty and error states keep it.
  const showRoute = !listed || changes.value.length === 0
  return (
    <>
      <div class="bb-publish__scroll">
        <section class="bb-publish__card bb-publish__card--fill" aria-label="Review changes">
          {showRoute && (
            <>
              <SectionTitle title="Publish route" showAction actionLabel="Settings" onAction={requestSettings} showCount={false} />
              <Pipeline nodes={pipelineNodes()} activeLinks={[!!result.value && !!status.value?.repo.connected, !!status.value?.repo.connected && !!status.value?.baseline]} />
            </>
          )}
          {listed ? <ChangeList onExtract={onExtract} /> : <StartState onExtract={onExtract} onRetryStatus={onRetryStatus} />}
        </section>
      </div>
      <ActionBar
        summary={summary()}
        secondary={listed && changes.value.length ? { label: 'Discard', onClick: () => { result.value = null; extractPhase.value = 'idle' } } : undefined}
        primary={{ label: 'Next: Release notes', disabled: !canContinue, onClick: () => { step.value = 1 } }}
      />
    </>
  )
}
