// Fixture handlers for browser-only development (?mode=mock), stories and UI
// tests. Unlike the Figma sandbox (which can't reach GitHub yet), the mock
// plays the whole pipeline — commit, build, deploy — so the flow can be designed
// end to end, including the failure outcomes.
import type { HandlerContext, HandlerMap } from '@shared/bridge'
import { testMessage } from '@shared/integrations'
import { diffSnapshots } from './diff'
import { BASELINE, BASELINE_RELEASE, CURRENT, HISTORY, SAMPLE_REPO, SAMPLE_SITE } from './fixtures'
import {
  MSG, publishRequestSchema,
  type ExtractResult, type StatusResult, type PipelineStepId, type PipelineStepState, type PublishOutcome, type PublishResult,
} from './messages'

/** Matches the dev harness "data" knob. `many` stands in for a first release here. */
export type MockScenario = 'default' | 'empty' | 'many' | 'slow' | 'error'

export interface PublishMockOptions {
  scenario?: MockScenario
  /** How the mock publish ends. */
  outcome?: Exclude<PublishOutcome, 'saved'>
  /** Repository missing in Settings › GitHub. */
  notConnected?: boolean
  /** Delay per pipeline step; tests pass 0. */
  stepDelayMs?: number
}

export const EXTRACT_FAILED_MESSAGE = 'Figma returned 403 Forbidden for the variables endpoint. The access token in Settings › Figma can’t read this file. Nothing was sent to the repository.'
const PUSH_LOG = '$ git push origin release/{v}:main\n! [remote rejected] main (protected branch hook declined)\nerror: failed to push some refs to bridge-ds-site'
const BUILD_LOG = '> astro build\nerror  Could not resolve "tokens/brand.richemont.json"\n  imported by src/pages/tokens/[brand].astro\nProcess completed with exit code 1.'

const STEP_DETAIL: Record<PipelineStepId, string> = {
  extract: 'Figma REST · 8 variables · 5 brand modes',
  components: 'Code Connect · 9 components · 4 changed',
  commit: `${SAMPLE_REPO.repo.split('/')[1]} · release/{v} · PR #62`,
  build: 'GitHub Actions #484 · Build docs',
  deploy: `Vercel · production · ${SAMPLE_SITE}`,
}
const STEP_TIME: Record<PipelineStepId, string> = { extract: '3s', components: '6s', commit: '2s', build: '1m 12s', deploy: '18s' }
const ORDER: readonly PipelineStepId[] = ['extract', 'components', 'commit', 'build', 'deploy']

const wait = (ms: number) => ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve()

export function createMockHandlers(options: PublishMockOptions | MockScenario = {}): HandlerMap {
  const { scenario = 'default', outcome = 'live', notConnected = false, stepDelayMs = 350 } = typeof options === 'string' ? { scenario: options } : options
  const first = scenario === 'many'
  const current = scenario === 'empty' ? BASELINE : CURRENT
  const changes = diffSnapshots(first ? null : BASELINE, current)

  const repo = notConnected ? { connected: false, repo: '', branch: 'main' } : SAMPLE_REPO

  async function status(): Promise<StatusResult> {
    return { repo, baseline: first ? null : BASELINE_RELEASE, history: first ? [] : HISTORY }
  }

  async function extract(): Promise<ExtractResult> {
    await wait(scenario === 'slow' ? 3000 : stepDelayMs)
    if (scenario === 'error') throw new Error(EXTRACT_FAILED_MESSAGE)
    return {
      extractId: 'mock-extract',
      extractedAt: new Date().toISOString(),
      counts: { variables: current.variables.length, components: current.components.length, modes: 5 },
      baseline: first ? null : BASELINE_RELEASE,
      changes,
      history: first ? [] : HISTORY,
      repo,
    }
  }

  async function publish(payload: unknown, ctx: HandlerContext): Promise<PublishResult> {
    const req = publishRequestSchema.parse(payload)
    const failAt: PipelineStepId | null = outcome === 'push-rejected' ? 'commit' : outcome === 'build-failed' ? 'build' : null
    const steps: PipelineStepState[] = ORDER.map((id) => ({ id, status: 'queued', detail: STEP_DETAIL[id].replace('{v}', req.version), time: '—' }))
    const set = (i: number, status: PipelineStepState['status']) => {
      steps[i] = { ...steps[i]!, status, time: status === 'done' || status === 'failed' ? STEP_TIME[steps[i]!.id] : status === 'running' ? '…' : '—' }
      ctx.emit(MSG.progress, { steps: [...steps] })
    }
    for (let i = 0; i < ORDER.length; i++) {
      set(i, 'running')
      await wait(stepDelayMs)
      if (ORDER[i] === failAt) { set(i, 'failed'); break }
      set(i, 'done')
    }
    const release = { version: req.version, title: req.title, publishedAt: new Date().toISOString(), changes: req.include.length }
    if (outcome === 'push-rejected') {
      return { outcome, release, steps, headline: 'Push to main was rejected', log: PUSH_LOG.replace('{v}', req.version), message: `main is protected on ${SAMPLE_REPO.repo} and needs a pull request. Nothing was committed; ${BASELINE_RELEASE.version} is still live.` }
    }
    if (outcome === 'build-failed') {
      return { outcome, release, steps, headline: 'Site build failed', log: BUILD_LOG, message: `GitHub Actions run #484 failed at “Build docs”. Nothing was deployed; ${BASELINE_RELEASE.version} is still live at ${SAMPLE_SITE}.` }
    }
    return { outcome: 'live', release, steps, headline: `${req.version} is live`, linkLabel: 'Open release page', link: `https://${SAMPLE_SITE}/releases/${req.version}`, message: `Published · ${req.include.length} changes · ${SAMPLE_SITE}` }
  }

  return {
    [MSG.status]: async () => status(),
    [MSG.open]: async (payload: { url: string }) => { if (typeof window !== 'undefined' && typeof window.open === 'function') window.open(payload.url, '_blank', 'noopener') },
    // Settings › GitHub › Test Connection in the dev harness: no network, so it only checks the fields are filled.
    [testMessage('github')]: async (payload: { repo?: string; apiKey?: string }) => {
      if (!payload?.repo?.trim() || !payload.apiKey?.trim()) throw new Error('Add the repository and access token first.')
      return { message: `Mock: connected as praveenmanchi · can push to ${payload.repo.trim()}. In Figma this asks GitHub.` }
    },
    [MSG.extract]: async () => extract(),
    [MSG.publish]: async (payload: unknown, ctx: HandlerContext) => publish(payload, ctx),
  }
}

export const mockHandlers: HandlerMap = createMockHandlers()
