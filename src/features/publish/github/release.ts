// Publishing a release to GitHub: one commit with the token file, the release
// record and the changelog, then either a pull request or a fast-forward of the
// branch, an optional tag, and a short watch of the GitHub Actions run it starts.
import { changelogMarkdown } from '../notes'
import type { PipelineStepState, PublishRequest, PublishResult } from '../messages'
import type { Change, ReleaseSummary, Snapshot } from '../types'
import { GithubError, type CommitFile, type GithubClient, type WorkflowRun } from './client'

export const CHANGELOG_PATH = 'CHANGELOG.md'
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

export function prependChangelog(existing: string | null, section: string): string {
  if (!existing?.trim()) return `# Changelog\n\n${section}`
  const heading = /^# .*\n+/.exec(existing)
  return heading ? `${heading[0]}${section}\n${existing.slice(heading[0].length)}` : `${section}\n${existing}`
}

export interface GithubReleaseInput {
  client: GithubClient
  request: PublishRequest
  release: ReleaseSummary
  /** The snapshot the release publishes (the old baseline with the included changes applied). */
  snapshot: Snapshot
  entries: ReadonlyArray<{ change: Change; text: string }>
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
    steps[i] = { ...steps[i]!, ...patch }
    emit([...steps])
  }

  // 1 — one commit with every file, not yet on any branch.
  const started = now().getTime()
  set('commit', { status: 'running', detail: `${repo} · preparing ${release.version}`, time: '…' })
  const head = await client.branchHead()
  const section = changelogMarkdown(release.version, release.title, input.entries)
  const files: CommitFile[] = [
    { path: tokensFilePath(client.config.tokenPath), content: tokensFile(input.snapshot, release) },
    { path: `releases/${release.version}.json`, content: releaseFile(release, input.entries) },
    { path: CHANGELOG_PATH, content: prependChangelog(await client.readFile(CHANGELOG_PATH), section) },
  ]
  const message = `release: ${release.version} — ${release.title}\n\n${release.changes} design-system changes published from Figma with Bluebird.`
  const commit = await client.commit(head, message, files)

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
    return {
      landed: true,
      result: {
        outcome: 'pr-opened', steps: [...steps], link: pr.url, linkLabel: 'Open pull request',
        headline: `${release.version} is ready for review`,
        message: `Opened pull request #${pr.number} on ${repo} with the tokens, the release record and the changelog. Merging it publishes the release.${tag}`,
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
    return { landed: true, result: { outcome: 'pushed', steps: [...steps], ...pushed, message: `Committed to ${repo} on ${branch}. No workflow ran for it, so check how your site is built.${tagNote}` } }
  }
  const took = seconds(now().getTime() - watchStart)
  if (run.status !== 'completed') {
    set('build', { status: 'running', detail: `GitHub Actions #${run.run_number} · still running`, time: took })
    return { landed: true, result: { outcome: 'pushed', steps: [...steps], ...pushed, link: run.html_url, linkLabel: 'Follow the run', message: `Committed to ${repo} on ${branch}. GitHub Actions run #${run.run_number} is still going; follow it on GitHub.${tagNote}` } }
  }
  if (run.conclusion !== 'success') {
    set('build', { status: 'failed', detail: `GitHub Actions #${run.run_number} · ${run.name}`, time: took })
    return {
      landed: true,
      result: {
        outcome: 'build-failed', steps: [...steps], headline: 'Site build failed', link: run.html_url, linkLabel: 'Open the run',
        log: `${run.name} #${run.run_number}: ${run.conclusion ?? 'failed'}\n${run.html_url}`,
        message: `${release.version} is committed to ${branch}, but GitHub Actions run #${run.run_number} ended “${run.conclusion}”. Fix the build in the repository; the release itself is recorded.`,
      },
    }
  }
  set('build', { status: 'done', detail: `GitHub Actions #${run.run_number} · ${run.name}`, time: took })
  set('deploy', { status: 'done', detail: 'Workflow finished — check your site', time: '—' })
  return { landed: true, result: { outcome: 'pushed', steps: [...steps], ...pushed, link: run.html_url, linkLabel: 'Open the run', message: `Committed to ${repo} on ${branch} and GitHub Actions run #${run.run_number} passed.${tagNote}` } }
}
