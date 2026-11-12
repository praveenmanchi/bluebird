import { useEffect } from 'preact/hooks'
import { LinkButton, Notice, PublishEmptyState, Spinner, useRpc } from '@shared/ui'
import { requestSettings } from '@shared/navigation'
import { refreshStatus, runExtract, runPush } from '../actions'
import { MSG } from '../messages'
import { extractError, hasBranches, phase, pushError, pushResult, reset, result, status, statusError } from '../state'
import { PushCard } from './PushCard'
import { Results } from './Results'
import { Toolbar } from './Toolbar'
import './extraction.css'

export interface ExtractionTabProps {
  /** Skip the status read on mount (stories that preload state). */
  preloaded?: boolean
}

function Body({ onExtract, onRetry, onPush, onRefresh }: { onExtract: () => void; onRetry: () => void; onPush: (pr: boolean) => void; onRefresh: () => void }) {
  const s = status.value
  if (statusError.value) {
    return <PublishEmptyState state="failed" title="Couldn’t reach GitHub" body={statusError.value} actions={[{ label: 'Open settings', variant: 'secondary', onClick: requestSettings }, { label: 'Try again', variant: 'primary', onClick: onRetry }]} />
  }
  if (!s) return <div class="bb-extraction__loading"><Spinner tone="accent" size="lg" label="Checking GitHub" /></div>
  if (!s.repo.connected) {
    return (
      <PublishEmptyState
        state="not-connected"
        title="GitHub is not connected"
        body={`${s.repo.problem ?? 'Connect a repository in Settings › GitHub'}. Extractions are saved to that repository so everyone compares against the same files.`}
        actions={[{ label: 'Open Settings', variant: 'primary', onClick: requestSettings }]}
      />
    )
  }
  if (phase.value === 'extracting') {
    return <div class="bb-extraction__loading" role="status"><Spinner tone="accent" size="lg" label="Reading variables and components" /><span>Reading variables and components…</span></div>
  }
  if (phase.value === 'failed') {
    return <PublishEmptyState state="failed" title="Extract failed" body={extractError.value} actions={[{ label: 'Open settings', variant: 'secondary', onClick: requestSettings }, { label: 'Try again', variant: 'primary', onClick: onExtract }]} />
  }
  if (!result.value) {
    const body = hasBranches.value
      ? 'Pick a branch and press Extract. Bluebird reads this file, compares it with the latest extraction on that branch, and lists what changed.'
      : 'Press Extract. Bluebird reads this file and lists everything in it; your first push creates the branch.'
    return <PublishEmptyState state="ready-to-extract" title="Nothing compared yet" body={body} actions={[]} />
  }
  return (
    <>
      <Results />
      <PushCard onPush={onPush} onRefresh={onRefresh} />
    </>
  )
}

/**
 * Extraction tab — Figma "Extraction v2 · single page · 600": GitHub status and the
 * branch to compare with, then on one scroll the variable changes, the components
 * they touch, and the push / pull request. The sandbox reads the file, compares it
 * with the latest extraction on the picked branch of the repository in Settings ›
 * GitHub, and commits the new extraction there.
 */
export function ExtractionTab({ preloaded = false }: ExtractionTabProps) {
  const rpc = useRpc()
  useEffect(() => {
    if (!preloaded) void refreshStatus(rpc)
    return () => reset()
  }, [])

  const refresh = () => { void refreshStatus(rpc) }
  const extract = () => { void runExtract(rpc) }
  const push = (pullRequest: boolean) => { void runPush(rpc, pullRequest) }
  const done = pushResult.value
  const link = done?.link

  return (
    <div class="bb-extraction">
      {done && (
        <Notice tone={done.outcome === 'rejected' ? 'error' : 'info'} title={done.headline}>
          {done.message}{' '}
          {link && <LinkButton onClick={() => { rpc.call(MSG.open, { url: link }).catch(() => undefined) }}>{done.linkLabel ?? 'Open on GitHub'}</LinkButton>}
        </Notice>
      )}
      {pushError.value && <Notice tone="error" title="The push did not finish">{pushError.value}</Notice>}
      <Toolbar onExtract={extract} />
      <Body onExtract={extract} onRetry={refresh} onPush={push} onRefresh={refresh} />
    </div>
  )
}

/** Shell entry: the registry renders tabs without props. */
export function Tab() {
  return <ExtractionTab />
}
