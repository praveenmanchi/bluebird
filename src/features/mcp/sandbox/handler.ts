// Runs inside Figma. Reads the selection and checks it for the handoff, reports each
// scenario's repository from Settings › MCP + code sync, lists library releases from the
// team History and the screens they affect, and asks GitHub whether the developer's pull
// request exists yet. Nothing is pushed from here: Claude Code or Cursor
// writes the code and opens the pull request from the prompt the tab copies.
import type { HandlerMap } from '@shared/bridge'
import { MCP_SCENARIOS, MCP_SCENARIO_LABEL, mcpTarget, mcpTargetProblem, type IntegrationValues, type McpScenario } from '@shared/integrations'
import { clientStorageRead, readIntegrations } from '@shared/integrations/effective'
import { isStorageProblem, resolveStorage } from '@shared/history/config'
import { listEntries } from '@shared/history/github'
import { RECENT_PULLS } from '@shared/github/client'
import { CodeHostError as GithubError, createCodeHost, mcpCodeHostConfig, type HostFetch as GithubFetch } from '@shared/codehost'
import { BITBUCKET_PAGE } from '@shared/codehost/bitbucket'
import { MSG, checkRequestSchema, focusRequestSchema, impactRequestSchema, openRequestSchema, trackRequestSchema, type CheckResult, type ImpactResult, type McpStatus, type ReleasesResult, type TargetStatus, type TrackedPull, type TrackResult } from '../messages'
import { combinedState, releasesFrom } from '../library'
import { findImpact } from './impact'
import { evaluate } from './checks'
import { collectInventory, describeSelection } from './inspect'

type Mcp = IntegrationValues<'mcp'>

async function focus(payload: unknown): Promise<void> {
  const { nodeId } = focusRequestSchema.parse(payload)
  const node = await figma.getNodeByIdAsync(nodeId)
  if (!node || node.type === 'DOCUMENT' || node.type === 'PAGE') throw new Error('That frame no longer exists')
  // A library update lists screens from every page: go to the screen's page before selecting it.
  let page: BaseNode | null = node.parent
  while (page && page.type !== 'PAGE') page = page.parent
  if (page && page.type === 'PAGE' && page.id !== figma.currentPage.id) await figma.setCurrentPageAsync(page)
  figma.currentPage.selection = [node as SceneNode]
  figma.viewport.scrollAndZoomIntoView([node as SceneNode])
}

async function check(payload: unknown): Promise<CheckResult> {
  const { nodeId } = checkRequestSchema.parse(payload)
  const node = await figma.getNodeByIdAsync(nodeId)
  if (!node || node.type === 'DOCUMENT' || node.type === 'PAGE') throw new Error('That frame no longer exists. Select it again.')
  return evaluate(await collectInventory(node as SceneNode))
}

/** One scenario's repository as the tab shows it: everything but the token. */
export function targetStatus(mcp: Mcp, scenario: McpScenario): TargetStatus {
  const { repo, branch, framework, folder, designPackage, pullRequests } = mcpTarget(mcp, scenario)
  const problem = mcpTargetProblem(mcp, scenario)
  return { connected: problem === null, repo, branch, framework, folder, designPackage, pullRequests, ...(problem ? { problem } : {}) }
}

export function mcpStatus(mcp: Mcp): McpStatus {
  return { targets: Object.fromEntries(MCP_SCENARIOS.map((s) => [s, targetStatus(mcp, s)])) as Record<McpScenario, TargetStatus> }
}

export interface TrackDeps {
  readMcp: () => Promise<Mcp>
  fetch: GithubFetch
}

/** Days of team History the release picker looks back. */
export const RELEASE_DAYS = 90

export interface ReleaseDeps {
  readGithub: () => Promise<IntegrationValues<'github'>>
  readStorage: () => Promise<IntegrationValues<'storage'>>
  fetch: GithubFetch
  now: () => Date
}

/** Library releases from the team History in Settings › Storage, newest first. */
export async function releases(deps: ReleaseDeps): Promise<ReleasesResult> {
  const [github, storage] = await Promise.all([deps.readGithub(), deps.readStorage()])
  const where = resolveStorage(storage, github)
  if (isStorageProblem(where)) return { releases: [], problem: `${where.problem} Library releases come from the team History.` }
  const client = createCodeHost(where.config, deps.fetch)
  const { entries } = await listEntries(client, where.config.branch, where.folder, RELEASE_DAYS, deps.now())
  return { releases: releasesFrom(entries) }
}

async function impact(payload: unknown): Promise<ImpactResult> {
  const { components } = impactRequestSchema.parse(payload)
  return findImpact(components)
}

/** The client's messages point at Settings › Code repository and ask for write access; this lookup uses the scenario's own token and only reads. */
function trackError(error: unknown, scenario: McpScenario, repo: string, host: string): Error {
  if (!(error instanceof GithubError)) return error instanceof Error ? error : new Error(`${host} could not be reached`)
  const label = MCP_SCENARIO_LABEL[scenario]
  if (error.kind === 'auth') return new Error(`${host} rejected the token for ${label}. Paste a new one in Settings › MCP + code sync.`)
  if (error.kind === 'access') return new Error(`The ${label} token can’t read pull requests in ${repo}. Give it read access to pull requests.`)
  if (error.kind === 'not-found') return new Error(`${host} can’t find ${repo}. Check the ${label} repository in Settings › MCP + code sync, and that its token can see it.`)
  return error
}

/** Looks for a pull request from the hand-off's branch in the scenario's repository, with that scenario's token. */
export async function track(payload: unknown, deps: TrackDeps): Promise<TrackResult> {
  const { scenario, branch, branches } = trackRequestSchema.parse(payload)
  const mcp = await deps.readMcp()
  const problem = mcpTargetProblem(mcp, scenario)
  if (problem) throw new Error(problem)
  const target = mcpTarget(mcp, scenario)
  const client = createCodeHost(mcpCodeHostConfig(target, mcp.enterpriseUrl), deps.fetch)
  if (branches) {
    const fail = (error: unknown): never => { throw trackError(error, scenario, target.repo, client.label) }
    const recent = await client.recentPulls(target.branch).catch(fail)
    // Only pull requests from this repository count: a fork can have a branch with the same name.
    const own = recent.filter((p) => p.headRepo.toLowerCase() === target.repo.toLowerCase())
    // On a busy repository an older pull request can fall out of the newest page: ask for those branches one by one.
    const full = recent.length >= (client.kind === 'bitbucket' ? BITBUCKET_PAGE : RECENT_PULLS)
    const pulls: TrackedPull[] = await Promise.all(branches.map(async (b): Promise<TrackedPull> => {
      const pr = own.find((p) => p.head === b) ?? (full ? await client.findPull(b).catch(fail) : null)
      return pr ? { branch: b, state: pr.state, number: pr.number, url: pr.url, title: pr.title } : { branch: b, state: 'waiting' }
    }))
    return { state: combinedState(pulls), repo: target.repo, branch, pulls }
  }
  const pull = await client.findPull(branch).catch((error: unknown) => { throw trackError(error, scenario, target.repo, client.label) })
  if (!pull) return { state: 'waiting', repo: target.repo, branch }
  return { state: pull.state, repo: target.repo, branch, number: pull.number, url: pull.url, title: pull.title }
}

const readMcp = async (): Promise<Mcp> => (await readIntegrations(clientStorageRead)).mcp
const sandboxFetch: GithubFetch = (url, init) => fetch(url, init)

export const handlers: HandlerMap = {
  [MSG.selection]: () => describeSelection(),
  [MSG.check]: check,
  [MSG.status]: async () => mcpStatus(await readMcp()),
  [MSG.track]: (payload: unknown) => track(payload, { readMcp, fetch: sandboxFetch }),
  [MSG.releases]: () => releases({
    readGithub: async () => (await readIntegrations(clientStorageRead)).github,
    readStorage: async () => (await readIntegrations(clientStorageRead)).storage,
    fetch: sandboxFetch,
    now: () => new Date(),
  }),
  [MSG.impact]: impact,
  [MSG.focus]: focus,
  [MSG.open]: (payload: unknown) => { figma.openExternal(openRequestSchema.parse(payload).url) },
}
