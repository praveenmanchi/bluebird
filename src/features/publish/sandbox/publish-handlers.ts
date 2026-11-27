// The Publish tab's sandbox handlers, built from injected dependencies so they
// run the same in Figma (handler.ts), in tests and with fixtures.
//
// The last release lives WITH THE FILE (document plugin data), so every designer
// who opens the tab diffs against the same release. Plugin data entries are capped
// at 100 kB, so the JSON is split across numbered chunks. Every release also commits
// the same store to the repository (.bluebird/releases.json); with Settings › Code repository ›
// "Enable diff comparison" on, an extract reads it back and compares against whichever
// copy is newer — the way Tokens Studio treats the repository as the source of truth.
import * as z from 'zod/mini'
import type { HandlerContext, HandlerMap } from '@shared/bridge'
import { normalizeIntegration, sectionSchemas, testMessage, type ConnectionTestResult, type IntegrationValues } from '@shared/integrations'
import type { GithubFetch } from '../github/client'
import { codeHostConfig, createCodeHost, isProblem } from '@shared/codehost'
import { CHANGELOG_PATH, STORE_PATH, configuredWebhooks, previewCommit, publishToGithub } from '../github/release'
import { applyChanges, diffSnapshots } from '../diff'
import {
  MSG, openRequestSchema, publishRequestSchema,
  type BaselineSource, type CommitPreview, type ExtractResult, type PipelineStepState, type PublishRequest, type PublishResult, type RepoStatus, type StatusResult,
} from '../messages'
import type { Change, ReleaseStore, ReleaseSummary, Snapshot } from '../types'

export type { ReleaseStore } from '../types'

/** Key/value text storage on the document (figma.root plugin data in Figma). */
export interface DocumentData {
  get(key: string): string
  set(key: string, value: string): void
}

export interface PublishDeps {
  readSnapshot(): Promise<Snapshot>
  readGithub(): Promise<IntegrationValues<'github'>>
  /** Settings › Notifications: the Teams / Power Automate webhooks "Post the changelog to Teams" uses. */
  readNotifications(): Promise<IntegrationValues<'notifications'>>
  data: DocumentData
  /** GitHub REST (and the Teams webhooks); the sandbox's fetch in Figma. */
  fetch: GithubFetch
  sleep(ms: number): Promise<void>
  /** figma.openExternal in Figma. */
  openExternal(url: string): void
  now(): Date
}

/** Settings › Code repository › Test Connection, answered here because Publish owns the GitHub connection. */
export const GITHUB_TEST = testMessage('github')

export const STORE_KEY = 'publish:release'
/** Characters per chunk; 30k chars stays under 100 kB even if every char needs 3 bytes. */
export const CHUNK_CHARS = 30_000
export const MAX_HISTORY = 20

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

/** A release store from its JSON (the file's plugin data or the repository's .bluebird/releases.json), or null when it does not parse. */
export function parseStore(raw: string | null): ReleaseStore | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as { releases?: unknown; baseline?: unknown }
    if (!Array.isArray(parsed.releases) || !parsed.releases.every(isSummary) || !isSnapshot(parsed.baseline)) return null
    return { releases: parsed.releases, baseline: parsed.baseline }
  } catch {
    return null
  }
}

/** The stored release, or null when the file has never been published or the data does not parse. */
export function readStore(data: DocumentData): ReleaseStore | null {
  return parseStore(readChunked(data, STORE_KEY))
}

export function writeStore(data: DocumentData, store: ReleaseStore): void {
  writeChunked(data, STORE_KEY, JSON.stringify(store))
}

const FIELD_LABELS: Record<string, string> = { repo: 'Repository', apiKey: 'Access token', baseUrl: 'Base URL', branch: 'Branch', tokenPath: 'Token path' }

function repoStatus(github: IntegrationValues<'github'>): RepoStatus {
  const config = codeHostConfig(github)
  const repo = github.repo.trim(), branch = github.branch.trim() || 'main', diffComparison = github.diffComparison
  if (!isProblem(config)) return { connected: true, repo, branch, diffComparison }
  const fields = config.fields.map((f) => FIELD_LABELS[f] ?? f).join(' and ')
  const problem = config.reason === 'incomplete' ? `Add the ${fields.toLowerCase()} in Settings › Code repository` : `Fix the ${fields.toLowerCase()} in Settings › Code repository`
  return { connected: false, repo, branch, diffComparison, problem }
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

const publishedAt = (store: ReleaseStore | null): number => Date.parse(store?.releases[0]?.publishedAt ?? '') || 0

/**
 * The baseline to diff against: the file's store, the repository's, or the newer of the two.
 * The repository is only read when Settings › Code repository › "Enable diff comparison" is on and the
 * connection is complete; a copy that cannot be read never blocks an extract.
 */
export async function resolveBaseline(
  local: ReleaseStore | null,
  github: IntegrationValues<'github'>,
  readRemote: (path: string, branch: string) => Promise<string | null>,
): Promise<{ store: ReleaseStore | null; source: BaselineSource; note?: string }> {
  const config = codeHostConfig(github)
  if (!github.diffComparison || isProblem(config)) return { store: local, source: local ? 'file' : 'none' }
  let remote: ReleaseStore | null = null
  try {
    const raw = await readRemote(STORE_PATH, config.branch)
    if (raw === null) return { store: local, source: local ? 'file' : 'none', note: `${config.repo} has no ${STORE_PATH} on ${config.branch} yet; it is written by the first publish.` }
    remote = parseStore(raw)
    if (!remote) return { store: local, source: local ? 'file' : 'none', note: `${STORE_PATH} on ${config.branch} isn’t a Bluebird release store, so the release in this file was used.` }
  } catch (e) {
    const why = e instanceof Error ? e.message : 'it could not be read'
    return { store: local, source: local ? 'file' : 'none', note: `Couldn’t read ${STORE_PATH} from ${config.repo}: ${why}` }
  }
  if (!local || publishedAt(remote) > publishedAt(local)) return { store: remote, source: 'github' }
  if (publishedAt(remote) < publishedAt(local)) {
    return { store: local, source: 'file', note: `${config.repo} is behind this file (${remote.releases[0]?.version ?? 'no release'} on ${config.branch}); compared with the release in this file.` }
  }
  return { store: local, source: 'file' }
}

export function createPublishHandlers(deps: PublishDeps): HandlerMap {
  /** The snapshot behind the last extract; a publish must name it so it never ships an unreviewed diff. */
  let last: { id: string; snapshot: Snapshot; changes: readonly Change[]; store: ReleaseStore | null } | null = null

  const notifyStatus = async () => ({ webhooks: configuredWebhooks(await deps.readNotifications()).length })

  async function status(): Promise<StatusResult> {
    const store = readStore(deps.data)
    const [github, notify] = await Promise.all([deps.readGithub(), notifyStatus()])
    return { repo: repoStatus(github), baseline: store?.releases[0] ?? null, history: store?.releases ?? [], notify }
  }

  async function extract(): Promise<ExtractResult> {
    const [snapshot, github] = await Promise.all([deps.readSnapshot(), deps.readGithub()])
    const local = readStore(deps.data)
    const config = codeHostConfig(github)
    const readRemote = (path: string, branch: string) => isProblem(config) ? Promise.resolve(null) : createCodeHost(config, deps.fetch, deps.sleep).readFile(path, branch)
    const { store, source, note } = await resolveBaseline(local, github, readRemote)
    // A newer repository copy becomes the file's baseline too, so Publish status and the next extract agree with it.
    if (store && store !== local) writeStore(deps.data, store)
    const changes = diffSnapshots(store?.baseline ?? null, snapshot)
    const id = `x${deps.now().getTime().toString(36)}`
    last = { id, snapshot, changes, store }
    const modes = new Set(snapshot.variables.flatMap((v) => Object.keys(v.values)))
    return {
      extractId: id,
      extractedAt: snapshot.takenAt,
      counts: { variables: snapshot.variables.length, components: snapshot.components.length, modes: modes.size },
      baseline: store?.releases[0] ?? null,
      baselineSource: source,
      ...(note ? { baselineNote: note } : {}),
      changes,
      history: store?.releases ?? [],
      repo: repoStatus(github),
    }
  }

  /** What a request publishes, checked against the extract it names. */
  function plan(req: PublishRequest) {
    if (!last || last.id !== req.extractId) throw new Error('This file changed since the last extract. Run the extract again before publishing.')
    const reviewed = last
    const include = new Set(req.include.filter((id) => reviewed.changes.some((c) => c.id === id)))
    if (include.size === 0) throw new Error('Pick at least one change to publish.')
    const release: ReleaseSummary = { version: req.version, title: req.title.trim(), publishedAt: deps.now().toISOString(), changes: include.size }
    const baseline = applyChanges(reviewed.store?.baseline ?? null, reviewed.snapshot, include)
    const noteById = new Map(req.notes.map((n) => [n.changeId, n.text]))
    const entries = reviewed.changes.filter((c) => include.has(c.id)).map((change) => ({ change, text: noteById.get(change.id) ?? '' }))
    const store: ReleaseStore = { releases: [release, ...(reviewed.store?.releases ?? [])].slice(0, MAX_HISTORY), baseline }
    return { reviewed, include, release, baseline, entries, store }
  }

  async function preview(payload: unknown): Promise<CommitPreview> {
    const req = publishRequestSchema.parse(payload)
    const { release, baseline, entries, store } = plan(req)
    const github = await deps.readGithub()
    return previewCommit({ tokenPath: github.tokenPath.trim() || 'tokens.json', release, snapshot: baseline, entries, store, existingChangelog: null })
  }

  async function publish(payload: unknown, ctx: HandlerContext): Promise<PublishResult> {
    const req = publishRequestSchema.parse(payload)
    const { reviewed, include, release, baseline, entries, store } = plan(req)
    const [github, notifications] = await Promise.all([deps.readGithub(), deps.readNotifications()])
    const config = codeHostConfig(github)
    const record = () => {
      writeStore(deps.data, store)
      last = null // the diff it came from is now stale
    }

    const steps: PipelineStepState[] = [
      { id: 'extract', status: 'done', detail: `${plural(reviewed.snapshot.variables.length, 'variable')} read`, time: '' },
      { id: 'components', status: 'done', detail: `${plural(reviewed.snapshot.components.length, 'component')} · ${plural(include.size, 'change')} included`, time: '' },
      { id: 'commit', status: 'queued', detail: '', time: '—' },
      { id: 'build', status: 'queued', detail: '', time: '—' },
      { id: 'deploy', status: 'queued', detail: '', time: '—' },
      ...(req.options.postToTeams ? [{ id: 'notify', status: 'queued', detail: '', time: '—' } satisfies PipelineStepState] : []),
    ]

    if (isProblem(config)) {
      const why = repoStatus(github).problem ?? 'Connect a repository in Settings › Code repository'
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
      client: createCodeHost(config, deps.fetch, deps.sleep),
      request: req, release, snapshot: baseline, entries, store, steps,
      webhooks: configuredWebhooks(notifications),
      emit: (next) => ctx.emit(MSG.progress, { steps: next }),
      sleep: deps.sleep,
      now: deps.now,
    })
    if (landed) record()
    return { ...result, release }
  }

  /** Settings › Code repository › Test Connection, with the form's unsaved values. */
  async function test(payload: unknown): Promise<ConnectionTestResult> {
    const values = z.safeParse(sectionSchemas.github, payload)
    if (!values.success) throw new Error('Those Code repository settings aren’t complete. Check the fields and try again.')
    const config = codeHostConfig(normalizeIntegration(values.data, 'github'))
    if (isProblem(config)) throw new Error(`${config.reason === 'incomplete' ? 'Add' : 'Fix'} the ${config.fields.map((f) => FIELD_LABELS[f] ?? f).join(' and ').toLowerCase()} first.`)
    const client = createCodeHost(config, deps.fetch, deps.sleep)
    const me = await client.whoAmI()
    if (!me.canPush) throw new Error(`Signed in as ${me.login}, but this token can’t push to ${config.repo}. Give it ${client.kind === 'bitbucket' ? 'Repositories' : 'Contents'} and Pull requests write access.`)
    // Like Tokens Studio's startup sync, say what the repository already holds.
    const [store, changelog] = await Promise.all([client.readFile(STORE_PATH).catch(() => null), client.readFile(CHANGELOG_PATH).catch(() => null)])
    const released = parseStore(store)?.releases[0]
    const holds = released ? ` ${config.branch} holds ${released.version}${values.data.diffComparison ? ', which extracts compare against' : ''}.` : changelog ? ` ${config.branch} has a changelog but no Bluebird release yet.` : ` ${config.branch} has no Bluebird release yet.`
    return { message: `Connected as ${me.login} · can push to ${config.repo} (default branch ${me.defaultBranch}).${holds}` }
  }

  return {
    [MSG.status]: async () => status(),
    [MSG.extract]: async () => extract(),
    [MSG.preview]: async (payload: unknown) => preview(payload),
    [MSG.publish]: async (payload: unknown, ctx: HandlerContext) => publish(payload, ctx),
    [GITHUB_TEST]: async (payload: unknown) => test(payload),
    [MSG.open]: async (payload: unknown) => {
      const { url } = openRequestSchema.parse(payload)
      // Only GitHub, Bitbucket (or the Enterprise host in Settings): the URL comes from the UI, so it isn't trusted to point anywhere else.
      const base = (await deps.readGithub()).baseUrl.trim().replace(/\/+$/, '')
      const allowed = ['https://github.com/', 'https://bitbucket.org/', ...(base.startsWith('https://') ? [`${base}/`] : [])]
      if (!allowed.some((prefix) => url.startsWith(prefix))) throw new Error('That link isn’t on GitHub or Bitbucket.')
      deps.openExternal(url)
    },
  }
}
