import type { Meta, StoryObj } from '@storybook/preact-vite'
import type { ComponentChildren } from 'preact'
import { RpcProvider } from '@shared/ui'
import { createRpcClient, createMockTransport } from '@shared/bridge'
import { diffSnapshots } from '../diff'
import { BASELINE, BASELINE_RELEASE, CURRENT, HISTORY, NO_REPO, SAMPLE_REPO } from '../fixtures'
import { createMockHandlers, EXTRACT_FAILED_MESSAGE, type PublishMockOptions } from '../mock'
import type { ExtractResult, PipelineStepState, PublishResult } from '../messages'
import {
  expanded, extractError, extractPhase, loadExtract, publishPhase, publishResult, reset, status, step, steps,
} from '../state'
import { PublishTab } from './Tab'

/** One Teams webhook in Settings › Notifications, so "Post the changelog to Teams" is available. */
const TEAMS = { webhooks: 1 }

/** The L plugin window — the size the Figma "Publish flow v2 · 600" frames are drawn at. */
const L = { width: '600px', height: '760px', display: 'flex', flexDirection: 'column' as const, overflow: 'auto' }

function frame(children: ComponentChildren, options: PublishMockOptions = {}) {
  const client = createRpcClient(createMockTransport(createMockHandlers({ stepDelayMs: 600, ...options }), 0))
  return <div style={L}><RpcProvider client={client}>{children}</RpcProvider></div>
}

function sample(overrides: Partial<ExtractResult> = {}): ExtractResult {
  return {
    extractId: 'story',
    extractedAt: new Date(Date.now() - 2 * 60_000).toISOString(),
    counts: { variables: CURRENT.variables.length, components: CURRENT.components.length, modes: 5 },
    baseline: BASELINE_RELEASE,
    baselineSource: 'file',
    changes: diffSnapshots(BASELINE, CURRENT),
    history: HISTORY,
    repo: SAMPLE_REPO,
    ...overrides,
  }
}

const STEP_STATES = (statuses: PipelineStepState['status'][]): PipelineStepState[] =>
  (['extract', 'components', 'commit', 'build', 'deploy'] as const).map((id, i) => ({
    id, status: statuses[i]!, time: statuses[i] === 'done' ? ['3s', '6s', '2s', '1m 12s', '18s'][i]! : statuses[i] === 'running' ? '…' : '—',
    detail: { extract: 'Figma REST · 8 variables · 8 brand modes', components: 'Code Connect · 9 components · 4 changed', commit: 'bridge-ds-site · release/v4.0.0 · PR #62', build: 'GitHub Actions #484 · Build docs', deploy: 'Vercel · production · ds.bridge.design' }[id],
  }))

const release = { version: 'v4.0.0', title: 'Button, Date picker and 10 more', publishedAt: new Date().toISOString(), changes: 12 }

/** Preload the tab, then hand it to PublishTab without the status read. */
function preloaded(setup: () => void, options?: PublishMockOptions) {
  reset()
  setup()
  return frame(<PublishTab preloaded />, options)
}

const meta = { title: 'Screens/Publish', parameters: { layout: 'centered' } } satisfies Meta
export default meta
type Story = StoryObj

/** Live in the mock: click through the whole flow (Run extract → … → Publish). */
export const Interactive: Story = { render: () => { reset(); return frame(<PublishTab />) } }

export const ReviewExtract: Story = {
  name: '1 Review changes · Extract',
  render: () => preloaded(() => { status.value = { repo: SAMPLE_REPO, baseline: BASELINE_RELEASE, history: HISTORY, notify: TEAMS } }),
}
export const ReviewChanges: Story = {
  name: '1 Review changes · Changes',
  render: () => preloaded(() => loadExtract(sample())),
}
export const ReviewDetails: Story = {
  name: '2 Review changes · Details',
  render: () => preloaded(() => { const x = sample(); loadExtract(x); expanded.value = x.changes[0]!.id }),
}
export const ReleaseNotes: Story = {
  name: '3 Release notes',
  render: () => preloaded(() => { loadExtract(sample()); step.value = 1 }),
}
export const FinalReview: Story = {
  name: '4 Final review',
  render: () => preloaded(() => { loadExtract(sample()); step.value = 2 }),
}
export const Publishing: Story = {
  name: '5 Publish · Publishing',
  render: () => preloaded(() => { loadExtract(sample()); step.value = 3; publishPhase.value = 'running'; steps.value = STEP_STATES(['done', 'done', 'done', 'running', 'queued']) }),
}
export const Link: Story = {
  name: '6 Publish · Link',
  render: () => preloaded(() => {
    loadExtract(sample()); step.value = 3; publishPhase.value = 'done'
    const s = STEP_STATES(['done', 'done', 'done', 'done', 'done'])
    steps.value = s
    publishResult.value = { outcome: 'live', release, steps: s, headline: 'v4.0.0 is live', linkLabel: 'Open release page', link: 'https://ds.bridge.design/releases/v4.0.0', message: 'Published 11 Oct, 16:05 · 12 changes · built in 1m 52s · ds.bridge.design' } satisfies PublishResult
  }),
}
/** What Figma shows today: the release is recorded in the file; GitHub isn't reachable from the plugin yet. */
export const SavedInFile: Story = {
  name: '6 Publish · Saved in this file',
  render: () => preloaded(() => {
    loadExtract(sample()); step.value = 3; publishPhase.value = 'done'
    const s = STEP_STATES(['done', 'done', 'queued', 'queued', 'queued']).map((x, i) => i > 1 ? { ...x, detail: 'Not run — add the access token in Settings › GitHub' } : x)
    steps.value = s
    publishResult.value = { outcome: 'saved', release, steps: s, headline: 'v4.0.0 saved in this file', message: 'v4.0.0 is recorded as this file’s latest release, so the next extract compares against it. Nothing was sent to GitHub: add the access token in Settings › GitHub to publish there.' }
  }),
}

export const NotConnected: Story = {
  name: 'Empty · Not connected',
  render: () => preloaded(() => { status.value = { repo: NO_REPO, baseline: BASELINE_RELEASE, history: HISTORY, notify: TEAMS } }, { notConnected: true }),
}
export const FirstRelease: Story = {
  name: 'Empty · First release',
  render: () => preloaded(() => { status.value = { repo: SAMPLE_REPO, baseline: null, history: [], notify: TEAMS } }, { scenario: 'many' }),
}
export const EmptyFile: Story = {
  name: 'Empty · Empty file',
  render: () => preloaded(() => loadExtract(sample({ counts: { variables: 0, components: 0, modes: 0 }, changes: [], baseline: null, history: [] }))),
}
export const NoChanges: Story = {
  name: 'Empty · No changes',
  render: () => preloaded(() => loadExtract(sample({ changes: [] }))),
}

export const ExtractFailed: Story = {
  name: 'Error · Extract failed',
  render: () => preloaded(() => {
    status.value = { repo: SAMPLE_REPO, baseline: BASELINE_RELEASE, history: HISTORY, notify: TEAMS }
    extractPhase.value = 'failed'; extractError.value = EXTRACT_FAILED_MESSAGE
  }, { scenario: 'error' }),
}
export const PushRejected: Story = {
  name: 'Error · Push rejected',
  render: () => preloaded(() => {
    loadExtract(sample()); step.value = 3; publishPhase.value = 'failed'
    const s = STEP_STATES(['done', 'done', 'failed', 'queued', 'queued'])
    steps.value = s
    publishResult.value = { outcome: 'push-rejected', release, steps: s, headline: 'Push to main was rejected', message: 'main is protected on praveenmanchi/bridge-ds-site and needs a pull request. Nothing was committed; v3.0.0 is still live.', log: '$ git push origin release/v4.0.0:main\n! [remote rejected] main (protected branch hook declined)\nerror: failed to push some refs to bridge-ds-site' }
  }, { outcome: 'push-rejected' }),
}
export const BuildFailed: Story = {
  name: 'Error · Build failed',
  render: () => preloaded(() => {
    loadExtract(sample()); step.value = 3; publishPhase.value = 'failed'
    const s = STEP_STATES(['done', 'done', 'done', 'failed', 'queued'])
    steps.value = s
    publishResult.value = { outcome: 'build-failed', release, steps: s, headline: 'Site build failed', message: 'GitHub Actions run #484 failed at “Build docs”. Nothing was deployed; v3.0.0 is still live at ds.bridge.design.', log: '> astro build\nerror  Could not resolve "tokens/brand.richemont.json"\n  imported by src/pages/tokens/[brand].astro\nProcess completed with exit code 1.' }
  }, { outcome: 'build-failed' }),
}
