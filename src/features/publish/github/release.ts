// Publishing a release to GitHub: one commit with the token file, the release
// record, the release store and the changelog, then either a pull request or a
// fast-forward of the branch, an optional tag, a short watch of the GitHub Actions
// run it starts, and the Teams post when the designer asked for one.
import type { IntegrationValues } from '@shared/integrations'
import { allowedWebhook, hostOf } from '@shared/integrations/webhooks'

export { allowedWebhook }
import { changelogMarkdown } from '../notes'
import { PREVIEW_CHARS, type CommitPreview, type CommitPreviewFile, type PipelineStepState, type PublishRequest, type PublishResult } from '../messages'
import type { Change, ReleaseStore, ReleaseSummary, Snapshot } from '../types'
import { GithubError, type CommitFile, type GithubClient, type GithubFetch, type WorkflowRun } from './client'

export const CHANGELOG_PATH = 'CHANGELOG.md'
/**
 * The release store, committed with every release. Tokens Studio keeps the repository as
 * the source of truth and compares the file against it; Bluebird keeps the baseline in the
 * Figma file for speed, and this copy lets Settings › GitHub › "Enable diff comparison"
 * recover it when the file has none or the repository is ahead.
 */
export const STORE_PATH = '.bluebird/releases.json'
/** How long to follow the CI run before handing the user the link. */
export const WATCH_MS = 150_000
export const POLL_MS = 5_000
/** Give up looking for a run that never started after this long. */
export const NO_RUN_MS = 30_000

/** A path without an extension is a folder: tokens → tokens/tokens.json. */
export function tokensFilePath(tokenPath: string): string {
  const clean = tokenPath.replace(/^\/+|\/+$/g, '')
  return /\.[a-z0-9]+$/i.test(clean) ? clean : `${clean}/tokens.json`
}

/** The design tokens as they stand in this release (included changes only). */
export function tokensFile(snapshot: Snapshot, release: ReleaseSummary): string {
  const collections: Record<string, Record<string, { type: string; values: Readonly<Record<string, string>>; description?: string }>> = {}
  for (const v of [...snapshot.variables].sort((a, b) => a.name.localeCompare(b.name))) {
    collections[v.collection] ??= {}
    collections[v.collection]![v.name] = { type: v.type, values: v.values, ...(v.description ? { description: v.description } : {}) }
  }
  const components = [...snapshot.components]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(({ name, page, variants, properties, description }) => ({ name, page, variants, properties, ...(description ? { description } : {}) }))
  return `${JSON.stringify({ version: release.version, generatedBy: 'Bluebird', publishedAt: release.publishedAt, collections, components }, null, 2)}\n`
}

export function releaseFile(release: ReleaseSummary, entries: ReadonlyArray<{ change: Change; text: string }>): string {
  const changes = entries.map(({ change, text }) => ({ kind: change.kind, subject: change.subject, name: change.name, detail: change.detail, breaking: change.breaking, note: text }))
  return `${JSON.stringify({ ...release, changes }, null, 2)}\n`
}

export function storeFile(store: ReleaseStore): string {
  return `${JSON.stringify(store, null, 2)}\n`
}

export function prependChangelog(existing: string | null, section: string): string {
  if (!existing?.trim()) return `# Changelog\n\n${section}`
  const heading = /^# .*\n+/.exec(existing)
  return heading ? `${heading[0]}${section}\n${existing.slice(heading[0].length)}` : `${section}\n${existing}`
}

export interface CommitInput {
  tokenPath: string
  release: ReleaseSummary
  /** The snapshot the release publishes (the old baseline with the included changes applied). */
  snapshot: Snapshot
  entries: ReadonlyArray<{ change: Change; text: string }>
  /** The store as it will stand once this release is recorded. */
  store: ReleaseStore
  /** CHANGELOG.md on the branch today; null when the repository has none yet. */
  existingChangelog: string | null
}

/** Every file of the release commit. Pure, so the Final review can show exactly what will be committed. */
export function commitFiles(input: CommitInput): CommitFile[] {
  const section = changelogMarkdown(input.release.version, input.release.title, input.entries)
  return [
    { path: tokensFilePath(input.tokenPath), content: tokensFile(input.snapshot, input.release) },
    { path: `releases/${input.release.version}.json`, content: releaseFile(input.release, input.entries) },
    { path: STORE_PATH, content: storeFile(input.store) },
    { path: CHANGELOG_PATH, content: prependChangelog(input.existingChangelog, section) },
  ]
}

export function commitMessage(release: ReleaseSummary): string {
  return `release: ${release.version} — ${release.title}\n\n${release.changes} design-system changes published from Figma with Bluebird.`
}

/** UTF-8 length without TextEncoder (the Figma sandbox has none). */
export function utf8Bytes(text: string): number {
  let bytes = 0
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i)
    if (code < 0x80) bytes += 1
    else if (code < 0x800) bytes += 2
    else if (code >= 0xd800 && code <= 0xdbff) { bytes += 4; i += 1 } // surrogate pair
    else bytes += 3
  }
  return bytes
}

const languageOf = (path: string): string => path.endsWith('.json') ? 'JSON' : path.endsWith('.md') ? 'Markdown' : 'Text'

/** The commit as the Final review shows it: paths, sizes and the start of each file. */
export function previewCommit(input: CommitInput): CommitPreview {
  const files: CommitPreviewFile[] = commitFiles(input).map((f) => ({
    path: f.path,
    bytes: utf8Bytes(f.content),
    language: languageOf(f.path),
    content: f.content.length > PREVIEW_CHARS ? `${f.content.slice(0, PREVIEW_CHARS)}\n…` : f.content,
    truncated: f.content.length > PREVIEW_CHARS,
  }))
  return { message: commitMessage(input.release), files }
}

// ── Teams ────────────────────────────────────────────────────────────────────

/** The webhooks Settings › Notifications holds, trimmed and de-duplicated. */
export function configuredWebhooks(n: IntegrationValues<'notifications'>): string[] {
  return [...new Set([n.designSystemWebhook, n.devTeamWebhook].map((u) => u.trim()).filter(Boolean))]
}

/**
 * The Teams message: a MessageCard, which an Incoming Webhook renders as a card and a
 * Power Automate flow receives as plain JSON (title, text and the link are top-level keys).
 */
export function teamsCard(release: ReleaseSummary, repo: string, changelog: string, link?: string, linkLabel?: string): string {
  return JSON.stringify({
    '@type': 'MessageCard',
    '@context': 'https://schema.org/extensions',
    summary: `${release.version} — ${release.title}`,
    themeColor: '0C8CE9',
    title: `${release.version} — ${release.title}`,
    text: `${release.changes} design-system change${release.changes === 1 ? '' : 's'} published from Figma to ${repo} with Bluebird.\n\n${changelog}`,
    ...(link ? { potentialAction: [{ '@type': 'OpenUri', name: linkLabel ?? 'Open on GitHub', targets: [{ os: 'default', uri: link }] }] } : {}),
  })
}

export interface NotifyInput {
  fetch: GithubFetch
  webhooks: readonly string[]
  release: ReleaseSummary
  repo: string
  changelog: string
  link?: string
  linkLabel?: string
}

/** Posts the changelog to every webhook. Never throws: the release has landed by now, so a failed post is reported, not fatal. */
export async function notifyTeams(input: NotifyInput): Promise<{ posted: number; failed: string[] }> {
  let posted = 0
  const failed: string[] = []
  const body = teamsCard(input.release, input.repo, input.changelog, input.link, input.linkLabel)
  for (const url of input.webhooks) {
    if (!allowedWebhook(url)) { failed.push(`${hostOf(url)}: not a Teams or Power Automate webhook host`); continue }
    try {
      const res = await input.fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
      if (res.status >= 200 && res.status < 300) posted += 1
      else failed.push(`${hostOf(url)}: HTTP ${res.status}`)
    } catch {
      failed.push(`${hostOf(url)}: unreachable`)
    }
  }
  return { posted, failed }
}


// ── GitHub ───────────────────────────────────────────────────────────────────

export interface GithubReleaseInput {
  client: GithubClient
  request: PublishRequest
  release: ReleaseSummary
  /** The snapshot the release publishes (the old baseline with the included changes applied). */
  snapshot: Snapshot
  entries: ReadonlyArray<{ change: Change; text: string }>
  /** The store as it will stand once this release is recorded. */
  store: ReleaseStore
  /** Settings › Notifications webhooks; empty when none is set. */
  webhooks: readonly string[]
  steps: PipelineStepState[]
  emit: (steps: readonly PipelineStepState[]) => void
  sleep: (ms: number) => Promise<void>
  now: () => Date
}

export interface GithubReleaseOutcome {
  result: Omit<PublishResult, 'release'>
  /** False when nothing reached GitHub (push rejected): the file must not record the release. */
  landed: boolean
}

const seconds = (ms: number) => ms < 60_000 ? `${Math.max(1, Math.round(ms / 1000))}s` : `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`

export async function publishToGithub(input: GithubReleaseInput): Promise<GithubReleaseOutcome> {
  const { client, request, release, steps, emit, sleep, now } = input
  const { repo, branch } = client.config
  const repoName = repo.split('/').pop()!
  const set = (id: PipelineStepState['id'], patch: Partial<PipelineStepState>) => {
    const i = steps.findIndex((s) => s.id === id)
    if (i < 0) return
    steps[i] = { ...steps[i]!, ...patch }
    emit([...steps])
  }

  // 1 — one commit with every file, not yet on any branch.
  const started = now().getTime()
  set('commit', { status: 'running', detail: `${repo} · preparing ${release.version}`, time: '…' })
  const head = await client.branchHead()
  const section = changelogMarkdown(release.version, release.title, input.entries)
  const files = commitFiles({
    tokenPath: client.config.tokenPath, release, snapshot: input.snapshot, entries: input.entries, store: input.store,
    existingChangelog: await client.readFile(CHANGELOG_PATH),
  })
  const commit = await client.commit(head, commitMessage(release), files)

  /** The Teams post, after the release is on GitHub. Adds its note to the result message. */
  async function notify(link: string | undefined, linkLabel: string | undefined): Promise<string> {
    if (!request.options.postToTeams) return ''
    if (!input.webhooks.length) {
      set('notify', { status: 'queued', detail: 'Not posted — add a webhook in Settings › Notifications', time: '—' })
      return ''
    }
    set('notify', { status: 'running', detail: `Posting to ${input.webhooks.length} Teams webhook${input.webhooks.length === 1 ? '' : 's'}`, time: '…' })
    const t0 = now().getTime()
    const { posted, failed } = await notifyTeams({ fetch: client.fetch, webhooks: input.webhooks, release, repo, changelog: section, link, linkLabel })
    const took = seconds(now().getTime() - t0)
    if (failed.length) {
      set('notify', { status: 'failed', detail: failed.join(' · '), time: took })
      return ` The Teams post failed (${failed.join('; ')}); the release itself is unaffected.`
    }
    set('notify', { status: 'done', detail: `Changelog posted to ${posted} Teams channel${posted === 1 ? '' : 's'}`, time: took })
    return ` The changelog was posted to Teams.`
  }

  // 2a — pull request: a release branch from the commit, then the PR.
  if (request.options.openPr) {
    let head = `release/${release.version}`
    try {
      await client.createRef(`refs/heads/${head}`, commit.sha)
    } catch (e) {
      if (!(e instanceof GithubError && e.kind === 'exists')) throw e
      head = `${head}-${now().getTime().toString(36)}`
      await client.createRef(`refs/heads/${head}`, commit.sha)
    }
    const pr = await client.openPull(head, branch, `${release.version} — ${release.title}`, section)
    set('commit', { status: 'done', detail: `${repoName} · ${head} · PR #${pr.number}`, time: seconds(now().getTime() - started) })
    set('build', { status: 'queued', detail: 'Your CI runs on the pull request and again when it merges', time: '—' })
    set('deploy', { status: 'queued', detail: `After the pull request merges into ${branch}`, time: '—' })
    const tag = request.options.tag ? ` Tag ${release.version} once it merges.` : ''
    const teams = await notify(pr.url, 'Open pull request')
    return {
      landed: true,
      result: {
        outcome: 'pr-opened', steps: [...steps], link: pr.url, linkLabel: 'Open pull request',
        headline: `${release.version} is ready for review`,
        message: `Opened pull request #${pr.number} on ${repo} with the tokens, the release record and the changelog. Merging it publishes the release.${tag}${teams}`,
      },
    }
  }

  // 2b — straight to the branch: fast-forward only, so a protected or moved branch is refused, not overwritten.
  try {
    await client.moveBranch(branch, commit.sha)
  } catch (e) {
    if (!(e instanceof GithubError && e.kind === 'rejected')) throw e
    set('commit', { status: 'failed', detail: `${repoName} · ${branch} · refused`, time: seconds(now().getTime() - started) })
    return {
      landed: false,
      result: {
        outcome: 'push-rejected', steps: [...steps], headline: `Push to ${branch} was rejected`,
        log: `PATCH refs/heads/${branch} → ${e.status}\n${e.detail || e.message}`,
        message: `${e.message} Nothing was published. Turn on “Open a pull request” to send it for review instead.`,
      },
    }
  }
  set('commit', { status: 'done', detail: `${repoName} · ${branch} · ${commit.sha.slice(0, 7)}`, time: seconds(now().getTime() - started) })
  let tagNote = ''
  if (request.options.tag) {
    try {
      await client.createRef(`refs/tags/${release.version}`, commit.sha)
    } catch (e) {
      if (!(e instanceof GithubError && e.kind === 'exists')) throw e
      tagNote = ` The tag ${release.version} already existed, so it was left alone.`
    }
  }

  // 3 — follow the CI run the push started.
  set('build', { status: 'running', detail: 'Waiting for GitHub Actions', time: '…' })
  const watchStart = now().getTime()
  let run: WorkflowRun | undefined
  while (now().getTime() - watchStart < WATCH_MS) {
    run = (await client.runsFor(commit.sha))[0]
    if (run?.status === 'completed') break
    if (!run && now().getTime() - watchStart >= NO_RUN_MS) break
    if (run) set('build', { status: 'running', detail: `GitHub Actions #${run.run_number} · ${run.name}`, time: '…' })
    await sleep(POLL_MS)
  }
  const pushed = { headline: `${release.version} pushed to ${branch}`, link: commit.url, linkLabel: 'Open commit' }
  if (!run) {
    set('build', { status: 'queued', detail: 'No GitHub Actions run started for this commit', time: '—' })
    set('deploy', { status: 'queued', detail: 'Nothing to deploy without a workflow', time: '—' })
    const teams = await notify(commit.url, 'Open commit')
    return { landed: true, result: { outcome: 'pushed', steps: [...steps], ...pushed, message: `Committed to ${repo} on ${branch}. No workflow ran for it, so check how your site is built.${tagNote}${teams}` } }
  }
  const took = seconds(now().getTime() - watchStart)
  if (run.status !== 'completed') {
    set('build', { status: 'running', detail: `GitHub Actions #${run.run_number} · still running`, time: took })
    const teams = await notify(run.html_url, 'Follow the run')
    return { landed: true, result: { outcome: 'pushed', steps: [...steps], ...pushed, link: run.html_url, linkLabel: 'Follow the run', message: `Committed to ${repo} on ${branch}. GitHub Actions run #${run.run_number} is still going; follow it on GitHub.${tagNote}${teams}` } }
  }
  if (run.conclusion !== 'success') {
    set('build', { status: 'failed', detail: `GitHub Actions #${run.run_number} · ${run.name}`, time: took })
    const teams = await notify(run.html_url, 'Open the run')
    return {
      landed: true,
      result: {
        outcome: 'build-failed', steps: [...steps], headline: 'Site build failed', link: run.html_url, linkLabel: 'Open the run',
        log: `${run.name} #${run.run_number}: ${run.conclusion ?? 'failed'}\n${run.html_url}`,
        message: `${release.version} is committed to ${branch}, but GitHub Actions run #${run.run_number} ended “${run.conclusion}”. Fix the build in the repository; the release itself is recorded.${teams}`,
      },
    }
  }
  set('build', { status: 'done', detail: `GitHub Actions #${run.run_number} · ${run.name}`, time: took })
  set('deploy', { status: 'done', detail: 'Workflow finished — check your site', time: '—' })
  const teams = await notify(run.html_url, 'Open the run')
  return { landed: true, result: { outcome: 'pushed', steps: [...steps], ...pushed, link: run.html_url, linkLabel: 'Open the run', message: `Committed to ${repo} on ${branch} and GitHub Actions run #${run.run_number} passed.${tagNote}${teams}` } }
}
