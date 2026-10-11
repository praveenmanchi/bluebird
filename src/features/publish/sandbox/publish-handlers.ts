// The Publish tab's sandbox handlers, built from injected dependencies so they
// run the same in Figma (handler.ts), in tests and with fixtures.
//
// The last release lives WITH THE FILE (document plugin data), so every designer
// who opens the tab diffs against the same release. Plugin data entries are capped
// at 100 kB, so the JSON is split across numbered chunks.
import * as z from 'zod/mini'
import type { HandlerContext, HandlerMap } from '@shared/bridge'
import { normalizeIntegration, sectionSchemas, testMessage, type ConnectionTestResult, type IntegrationValues } from '@shared/integrations'
import { configFromSettings, createGithubClient, isProblem, type GithubFetch } from '../github/client'
import { publishToGithub } from '../github/release'
import { applyChanges, diffSnapshots } from '../diff'
import {
  MSG, openRequestSchema, publishRequestSchema,
  type ExtractResult, type PipelineStepState, type PublishResult, type RepoStatus, type StatusResult,
} from '../messages'
import type { Change, ReleaseSummary, Snapshot } from '../types'

/** Key/value text storage on the document (figma.root plugin data in Figma). */
export interface DocumentData {
  get(key: string): string
  set(key: string, value: string): void
}

export interface PublishDeps {
  readSnapshot(): Promise<Snapshot>
  readGithub(): Promise<IntegrationValues<'github'>>
  data: DocumentData
  /** GitHub REST; the sandbox's fetch in Figma. */
  fetch: GithubFetch
  sleep(ms: number): Promise<void>
  /** figma.openExternal in Figma. */
  openExternal(url: string): void
  now(): Date
}

/** Settings › GitHub › Test Connection, answered here because Publish owns the GitHub connection. */
export const GITHUB_TEST = testMessage('github')

/** What the file stores: the release history (newest first) and the snapshot the next diff compares against. */
export interface ReleaseStore {
  releases: readonly ReleaseSummary[]
  baseline: Snapshot
}

export const STORE_KEY = 'publish:release'
/** Characters per chunk; 30k chars stays under 100 kB even if every char needs 3 bytes. */
export const CHUNK_CHARS = 30_000
const MAX_HISTORY = 20

export function writeChunked(data: DocumentData, key: string, value: string): void {
  const count = Math.max(1, Math.ceil(value.length / CHUNK_CHARS))
  const previous = Number(data.get(`${key}:n`)) || 0
  for (let i = 0; i < count; i++) data.set(`${key}:${i}`, value.slice(i * CHUNK_CHARS, (i + 1) * CHUNK_CHARS))
  for (let i = count; i < previous; i++) data.set(`${key}:${i}`, '') // an empty value deletes plugin data
  data.set(`${key}:n`, String(count))
}

export function readChunked(data: DocumentData, key: string): string | null {
  const count = Number(data.get(`${key}:n`))
  if (!Number.isInteger(count) || count < 1) return null
  let out = ''
  for (let i = 0; i < count; i++) out += data.get(`${key}:${i}`)
  return out
}

function isSummary(x: unknown): x is ReleaseSummary {
  const r = x as ReleaseSummary
  return !!r && typeof r.version === 'string' && typeof r.title === 'string' && typeof r.publishedAt === 'string' && typeof r.changes === 'number'
}

function isSnapshot(x: unknown): x is Snapshot {
  const s = x as Snapshot
  return !!s && typeof s.takenAt === 'string' && Array.isArray(s.variables) && Array.isArray(s.components)
}

/** The stored release, or null when the file has never been published or the data does not parse. */
export function readStore(data: DocumentData): ReleaseStore | null {
  const raw = readChunked(data, STORE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as { releases?: unknown; baseline?: unknown }
    if (!Array.isArray(parsed.releases) || !parsed.releases.every(isSummary) || !isSnapshot(parsed.baseline)) return null
    return { releases: parsed.releases, baseline: parsed.baseline }
  } catch {
    return null
  }
}

const FIELD_LABELS: Record<string, string> = { repo: 'Repository', apiKey: 'Access token', baseUrl: 'Base URL', branch: 'Branch', tokenPath: 'Token path' }

function repoStatus(github: IntegrationValues<'github'>): RepoStatus {
  const config = configFromSettings(github)
  const repo = github.repo.trim(), branch = github.branch.trim() || 'main'
  if (!isProblem(config)) return { connected: true, repo, branch }
  const fields = config.fields.map((f) => FIELD_LABELS[f] ?? f).join(' and ')
  const problem = config.reason === 'incomplete' ? `Add the ${fields.toLowerCase()} in Settings › GitHub` : `Fix the ${fields.toLowerCase()} in Settings › GitHub`
  return { connected: false, repo, branch, problem }
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export function createPublishHandlers(deps: PublishDeps): HandlerMap {
  /** The snapshot behind the last extract; a publish must name it so it never ships an unreviewed diff. */
  let last: { id: string; snapshot: Snapshot; changes: readonly Change[] } | null = null

  async function status(): Promise<StatusResult> {
    const store = readStore(deps.data)
    return { repo: repoStatus(await deps.readGithub()), baseline: store?.releases[0] ?? null, history: store?.releases ?? [] }
  }

  async function extract(): Promise<ExtractResult> {
    const [snapshot, github] = await Promise.all([deps.readSnapshot(), deps.readGithub()])
    const store = readStore(deps.data)
    const changes = diffSnapshots(store?.baseline ?? null, snapshot)
    const id = `x${deps.now().getTime().toString(36)}`
    last = { id, snapshot, changes }
    const modes = new Set(snapshot.variables.flatMap((v) => Object.keys(v.values)))
    return {
      extractId: id,
      extractedAt: snapshot.takenAt,
      counts: { variables: snapshot.variables.length, components: snapshot.components.length, modes: modes.size },
      baseline: store?.releases[0] ?? null,
      changes,
      history: store?.releases ?? [],
      repo: repoStatus(github),
    }
  }

  async function publish(payload: unknown, ctx: HandlerContext): Promise<PublishResult> {
    const req = publishRequestSchema.parse(payload)
    if (!last || last.id !== req.extractId) throw new Error('This file changed since the last extract. Run the extract again before publishing.')
    const reviewed = last
    const include = new Set(req.include.filter((id) => reviewed.changes.some((c) => c.id === id)))
    if (include.size === 0) throw new Error('Pick at least one change to publish.')

    const github = await deps.readGithub()
    const config = configFromSettings(github)
    const store = readStore(deps.data)
    const release: ReleaseSummary = { version: req.version, title: req.title.trim(), publishedAt: deps.now().toISOString(), changes: include.size }
    const baseline = applyChanges(store?.baseline ?? null, reviewed.snapshot, include)
    const noteById = new Map(req.notes.map((n) => [n.changeId, n.text]))
    const entries = reviewed.changes.filter((c) => include.has(c.id)).map((change) => ({ change, text: noteById.get(change.id) ?? '' }))
    const record = () => {
      writeChunked(deps.data, STORE_KEY, JSON.stringify({ releases: [release, ...(store?.releases ?? [])].slice(0, MAX_HISTORY), baseline } satisfies ReleaseStore))
      last = null // the diff it came from is now stale
    }

    const steps: PipelineStepState[] = [
      { id: 'extract', status: 'done', detail: `${plural(reviewed.snapshot.variables.length, 'variable')} read`, time: '' },
      { id: 'components', status: 'done', detail: `${plural(reviewed.snapshot.components.length, 'component')} · ${plural(include.size, 'change')} included`, time: '' },
      { id: 'commit', status: 'queued', detail: '', time: '—' },
      { id: 'build', status: 'queued', detail: '', time: '—' },
      { id: 'deploy', status: 'queued', detail: '', time: '—' },
    ]

    if (isProblem(config)) {
      const why = repoStatus(github).problem ?? 'Connect a repository in Settings › GitHub'
      for (const s of steps.slice(2)) s.detail = `Not run — ${why.charAt(0).toLowerCase()}${why.slice(1)}`
      ctx.emit(MSG.progress, { steps })
      record()
      return {
        outcome: 'saved', release, steps, headline: `${req.version} saved in this file`,
        message: `${req.version} is recorded as this file’s latest release, so the next extract compares against it. Nothing was sent to GitHub: ${why.charAt(0).toLowerCase()}${why.slice(1)} to publish there.`,
      }
    }

    ctx.emit(MSG.progress, { steps })
    const { result, landed } = await publishToGithub({
      client: createGithubClient(config, deps.fetch),
      request: req, release, snapshot: baseline, entries, steps,
      emit: (next) => ctx.emit(MSG.progress, { steps: next }),
      sleep: deps.sleep,
      now: deps.now,
    })
    if (landed) record()
    return { ...result, release }
  }

  /** Settings › GitHub › Test Connection, with the form's unsaved values. */
  async function test(payload: unknown): Promise<ConnectionTestResult> {
    const values = z.safeParse(sectionSchemas.github, payload)
    if (!values.success) throw new Error('Those GitHub settings aren’t complete. Check the fields and try again.')
    const config = configFromSettings(normalizeIntegration(values.data, 'github'))
    if (isProblem(config)) throw new Error(`${config.reason === 'incomplete' ? 'Add' : 'Fix'} the ${config.fields.map((f) => FIELD_LABELS[f] ?? f).join(' and ').toLowerCase()} first.`)
    const me = await createGithubClient(config, deps.fetch).whoAmI()
    if (!me.canPush) throw new Error(`Signed in as ${me.login}, but this token can’t push to ${config.repo}. Give it Contents and Pull requests write access.`)
    return { message: `Connected as ${me.login} · can push to ${config.repo} (default branch ${me.defaultBranch}).` }
  }

  return {
    [MSG.status]: async () => status(),
    [MSG.extract]: async () => extract(),
    [MSG.publish]: async (payload: unknown, ctx: HandlerContext) => publish(payload, ctx),
    [GITHUB_TEST]: async (payload: unknown) => test(payload),
    [MSG.open]: async (payload: unknown) => {
      const { url } = openRequestSchema.parse(payload)
      // Only GitHub (or the Enterprise host in Settings): the URL comes from the UI, so it isn't trusted to point anywhere else.
      const base = (await deps.readGithub()).baseUrl.trim().replace(/\/+$/, '')
      const allowed = ['https://github.com/', ...(base.startsWith('https://') ? [`${base}/`] : [])]
      if (!allowed.some((prefix) => url.startsWith(prefix))) throw new Error('That link isn’t on GitHub.')
      deps.openExternal(url)
    },
  }
}
