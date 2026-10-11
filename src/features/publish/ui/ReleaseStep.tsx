import { useState } from 'preact/hooks'
import {
  Button, CodeSnippet, Icon, Input, Notice, PublishEmptyState, PublishStep, ReleaseRow, SectionTitle,
  type PublishEmptyStateAction,
} from '@shared/ui'
import type { PipelineStepState } from '../messages'
import { nextVersion, options, publishError, publishPhase, publishResult, status, step, steps, title } from '../state'
import { ActionBar } from './ActionBar'
import { copyText } from './clipboard'
import { PIPELINE_STEP_TITLE, plural, shortDate } from './format'

export type OpenLink = (url: string) => void

export interface ReleaseStepProps {
  onPublish: () => void
  onStartOver: () => void
  /** Opens a GitHub / site link in the browser (through the sandbox in Figma). */
  onOpen: OpenLink
}

function StepsCard({ list }: { list: readonly PipelineStepState[] }) {
  return (
    <section class="bb-publish__card" aria-label="Publish steps">
      <SectionTitle title="Publish steps" showCount={false} showAction={false} />
      <ol class="bb-publish__list" aria-live="polite">
        {list.map((s) => (
          <li key={s.id}><PublishStep status={s.status} title={PIPELINE_STEP_TITLE[s.id]} detail={s.detail} time={s.time} /></li>
        ))}
      </ol>
    </section>
  )
}

function History() {
  const history = status.value?.history ?? []
  const latest = publishResult.value?.release
  const rows = latest ? [latest, ...history.filter((h) => h.version !== latest.version)] : history
  if (!rows.length) return null
  return (
    <>
      <SectionTitle title="Release history" showCount count={rows.length} showAction={false} />
      <ul class="bb-publish__list" aria-label="Release history">
        {rows.slice(0, 4).map((r) => (
          <li key={r.version}><ReleaseRow version={r.version} summary={r.title} meta={`${shortDate(r.publishedAt)} · ${plural(r.changes, 'change')}`} status="live" /></li>
        ))}
      </ul>
    </>
  )
}

function useCopy(): [string | null, (text: string) => Promise<void>] {
  const [copied, setCopied] = useState<string | null>(null)
  return [copied, async (text) => setCopied((await copyText(text)) ? 'Link copied.' : 'Copying is blocked here — select the link and copy it.')]
}

/** Live (the mock's docs-site flow): the release page link, generated for this release. */
function LiveCard({ onOpen }: { onOpen: OpenLink }) {
  const res = publishResult.value!
  const [copied, copy] = useCopy()
  const site = res.link ? new URL(res.link).origin : null
  return (
    <section class="bb-publish__card" aria-label="Release">
      <div class="bb-publish__success" role="status">
        <h3 class="bb-publish__success-title"><Icon name="status-good" class="bb-publish__success-icon" /> {res.headline}</h3>
        <p class="bb-publish__hint">{res.message}</p>
        {site && <div class="bb-publish__buttons"><Button onClick={() => onOpen(site)}>Open site</Button></div>}
      </div>
      {res.link && (
        <>
          <SectionTitle title="Release link" showCount={false} showAction={false} />
          <Input label="Generated for this release" value={res.link} readOnly />
          <div class="bb-publish__buttons">
            <Button onClick={() => copy(res.link!)}>Copy link</Button>
            <Button variant="secondary" onClick={() => onOpen(res.link!)}>{res.linkLabel ?? 'Open release page'}</Button>
          </div>
          <p class="bb-publish__hint" aria-live="polite">{copied ?? `The link always opens the ${res.release.version} changelog, even after newer releases.`}</p>
        </>
      )}
      <History />
    </section>
  )
}

/** Pushed / pull request opened / saved in the file: headline, what happened, and the GitHub link when there is one. */
function ResultCard({ onOpen }: { onOpen: OpenLink }) {
  const res = publishResult.value!
  const [copied, copy] = useCopy()
  return (
    <section class="bb-publish__card" aria-label="Release">
      <div class="bb-publish__success" role="status">
        <h3 class="bb-publish__success-title"><Icon name="status-good" class="bb-publish__success-icon" /> {res.headline}</h3>
        <p class="bb-publish__hint">{res.message}</p>
        {res.link && (
          <div class="bb-publish__buttons">
            <Button onClick={() => onOpen(res.link!)}>{res.linkLabel ?? 'Open on GitHub'}</Button>
            <Button variant="secondary" onClick={() => copy(res.link!)}>Copy link</Button>
          </div>
        )}
        {copied && <p class="bb-publish__hint" aria-live="polite">{copied}</p>}
      </div>
      <History />
    </section>
  )
}

function FailedCard({ onPublish, onOpen }: Pick<ReleaseStepProps, 'onPublish'> & { onOpen: OpenLink }) {
  const res = publishResult.value
  const backToReview = () => { publishPhase.value = 'idle'; step.value = 2 }
  if (!res) {
    return (
      <section class="bb-publish__card" aria-label="Release">
        <PublishEmptyState state="failed" title="Publishing stopped" body={publishError.value} actions={[{ label: 'Back', variant: 'secondary', onClick: backToReview }, { label: 'Try again', variant: 'primary', onClick: onPublish }]} />
      </section>
    )
  }
  const pushRejected = res.outcome === 'push-rejected'
  const back: PublishEmptyStateAction = { label: 'Back to final review', variant: 'secondary', onClick: backToReview }
  const primary: PublishEmptyStateAction = pushRejected
    ? { label: 'Open a pull request', variant: 'primary', onClick: () => { options.value = { ...options.value, openPr: true }; onPublish() } }
    // A real CI failure is fixed in the repository, so link to the run; the mock can retry.
    : res.link ? { label: res.linkLabel ?? 'Open the run', variant: 'primary', onClick: () => onOpen(res.link!) } : { label: 'Retry build', variant: 'primary', onClick: onPublish }
  return (
    <section class="bb-publish__card" aria-label={`Release ${res.release.version} ${pushRejected ? 'not published' : 'build failed'}`}>
      <SectionTitle title={`Release ${res.release.version} · ${pushRejected ? 'not published' : 'committed, build failed'}`} showCount={false} showAction={false} />
      <PublishEmptyState state="failed" title={res.headline} body={res.message} actions={[back, primary]} />
      {res.log && <>
        <SectionTitle title={pushRejected ? 'Git output' : 'Build log'} showCount={false} showAction={false} />
        <CodeSnippet language="Log" code={res.log} copyLabel="Copy log" onCopy={() => { void copyText(res.log!) }} />
      </>}
    </section>
  )
}

function RunningCard() {
  return (
    <section class="bb-publish__card" aria-label="Release">
      <SectionTitle title="Release" showCount={false} showAction={false} />
      <ReleaseRow version={nextVersion.value} summary={title.value || nextVersion.value} meta="Publishing now" status="building" />
      <Notice tone="info" title="Keep the plugin open">Bluebird commits to GitHub and follows the CI run from here. The previous release stays live until the new one is out.</Notice>
    </section>
  )
}

/** Step 4 — Figma "Publish v2 · 5 Publish" (Publishing / Link), the pushed / pull-request results and the Push rejected / Build failed states. */
export function ReleaseStep({ onPublish, onStartOver, onOpen }: ReleaseStepProps) {
  const phase = publishPhase.value
  const res = publishResult.value
  const main = phase === 'running' ? <RunningCard />
    : phase === 'failed' ? <FailedCard onPublish={onPublish} onOpen={onOpen} />
      : res?.outcome === 'live' ? <LiveCard onOpen={onOpen} /> : <ResultCard onOpen={onOpen} />
  const list = steps.value
  return (
    <>
      <div class="bb-publish__scroll">
        {phase === 'running' ? <><StepsCard list={list} />{main}</> : <>{main}{list.length > 0 && <StepsCard list={list} />}</>}
      </div>
      {phase === 'done' && <ActionBar summary={res ? `${res.release.version} · ${plural(res.release.changes, 'change')}` : ''} primary={{ label: 'Start the next release', onClick: onStartOver }} />}
    </>
  )
}
