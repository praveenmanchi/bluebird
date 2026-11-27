// Fixture handlers for browser-only development (?mode=mock), stories and UI
// tests: branches, an extraction compared with BASELINE, and a push that ends
// the way `outcome` says. No network.
import type { HandlerMap } from '@shared/bridge'
import { BASELINE, BRANCHES, CURRENT, SAMPLE_REPO } from './fixtures'
import {
  MSG, extractRequestSchema, pushRequestSchema,
  type ExtractResult, type NotifyChannels, type PushOutcome, type PushResult, type StatusResult,
} from './messages'
import { draftMessage, impactedComponents, modeCounts, summaryLines, variableChanges } from './model'

/** Matches the dev harness "data" knob. `many` stands in for a repository with no branches yet. */
export type MockScenario = 'default' | 'empty' | 'many' | 'slow' | 'error'

export interface ExtractionMockOptions {
  scenario?: MockScenario
  /** Repository or token missing in Settings › Code repository. */
  notConnected?: boolean
  /** How the mock push ends. */
  outcome?: PushOutcome
  /** Webhooks set in Settings › Notifications. */
  channels?: NotifyChannels
  /** Delay per call; tests pass 0. */
  delayMs?: number
}

export const EXTRACT_FAILED_MESSAGE = 'GitHub didn’t accept the access token. Create a new one and paste it in Settings › Code repository.'

const wait = (ms: number) => ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve()

export function createMockHandlers(options: ExtractionMockOptions | MockScenario = {}): HandlerMap {
  const { scenario = 'default', notConnected = false, outcome = 'pr-opened', channels = { designSystem: true, devTeam: true }, delayMs = 350 } = typeof options === 'string' ? { scenario: options } : options
  const noBranches = scenario === 'many'
  const current = scenario === 'empty' ? BASELINE : CURRENT

  async function status(): Promise<StatusResult> {
    if (notConnected) return { repo: { connected: false, repo: '', problem: 'Add the repository and access token in Settings › Code repository' }, branches: [], defaultBranch: '', channels }
    return { repo: { connected: true, repo: SAMPLE_REPO }, branches: noBranches ? [] : BRANCHES, defaultBranch: noBranches ? '' : 'main', channels }
  }

  async function extract(payload: unknown): Promise<ExtractResult> {
    const { branch } = extractRequestSchema.parse(payload)
    await wait(scenario === 'slow' ? 3000 : delayMs)
    if (scenario === 'error') throw new Error(EXTRACT_FAILED_MESSAGE)
    const stamp = BRANCHES.find((b) => b.name === branch)?.latest ?? null
    const baseline = stamp ? BASELINE : null
    const changes = variableChanges(baseline, current)
    return {
      extractId: 'mock-extraction',
      extractedAt: new Date().toISOString(),
      branch,
      baseline: stamp,
      counts: { variables: current.variables.length, components: current.components.length, modes: 3 },
      changes,
      modes: modeCounts(changes),
      impacted: impactedComponents(changes, baseline, current),
      message: draftMessage(changes),
    }
  }

  async function push(payload: unknown): Promise<PushResult> {
    const req = pushRequestSchema.parse(payload)
    await wait(delayMs)
    if (outcome === 'rejected') {
      return { outcome, headline: `Push to ${req.target} was rejected`, message: `GitHub refused the update: ${req.target} is protected. Nothing was pushed and nobody was notified. Push to a new branch instead.` }
    }
    const changes = variableChanges(BASELINE, current)
    const line = summaryLines(changes, impactedComponents(changes, BASELINE, current))[0]!
    const told = [req.notify.designSystem && channels.designSystem, req.notify.devTeam && channels.devTeam].filter(Boolean).length
    const notified = told ? ` ${told === 1 ? '1 channel was' : `${told} channels were`} notified.` : ''
    if (req.pullRequest && outcome === 'pr-opened') {
      return { outcome: 'pr-opened', headline: 'Pull request #74 is open', message: `Pushed to ${req.target}. ${line}${notified}`, link: `https://github.com/${SAMPLE_REPO}/pull/74`, linkLabel: 'Open pull request #74' }
    }
    return { outcome: 'pushed', headline: `Pushed to ${req.target}`, message: `${line}${notified}`, link: `https://github.com/${SAMPLE_REPO}/commit/0a1b2c3`, linkLabel: 'Open commit' }
  }

  return {
    [MSG.status]: async () => status(),
    [MSG.extract]: async (payload: unknown) => extract(payload),
    [MSG.push]: async (payload: unknown) => push(payload),
    [MSG.open]: async (payload: { url: string }) => { if (typeof window !== 'undefined' && typeof window.open === 'function') window.open(payload.url, '_blank', 'noopener') },
  }
}

export const mockHandlers: HandlerMap = createMockHandlers()
