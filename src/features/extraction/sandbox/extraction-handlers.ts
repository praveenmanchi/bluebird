// The Extraction tab's sandbox handlers, built from injected dependencies so
// they run the same in Figma (handler.ts), in tests and with fixtures.
//
// Nothing is stored in the Figma file: every branch of the repository in
// Settings › Code repository holds its own extractions (see model.ts), so the whole team
// compares against the same files.
import type { HandlerMap } from '@shared/bridge'
import type { IntegrationValues } from '@shared/integrations'
import { allowedWebhook, normalizeWebhook } from '@shared/integrations/webhooks'
import { cardPayload, type CardFacts, type CardInput } from '@shared/integrations/card'
import { CodeHostError as GithubError, codeHostConfig, createCodeHost, isProblem, type CodeHost, type HostFetch as GithubFetch } from '@shared/codehost'
import type { Change, Snapshot } from '@shared/design/types'
import { recordHistory } from '@shared/history/record'
import { extractionEntry } from '../history'
import {
  MSG, extractRequestSchema, openRequestSchema, pushRequestSchema,
  type BranchInfo, type ExtractResult, type ImpactedComponent, type PushResult, type StatusResult,
} from '../messages'
import {
  INDEX_PATH, LATEST_PATH, countKinds, draftMessage, impactedComponents, modeCounts, nextIndex, parseExtraction, parseIndex, stampPath, summaryLines, variableChanges,
  type ExtractionFile, type IndexEntry,
} from '../model'

export interface ExtractionDeps {
  readSnapshot(): Promise<Snapshot>
  readGithub(): Promise<IntegrationValues<'github'>>
  readNotifications(): Promise<IntegrationValues<'notifications'>>
  /** Settings › Storage, where the push is recorded in the team History; omitted = use the GitHub repository. */
  readStorage?(): Promise<IntegrationValues<'storage'>>
  /** GitHub REST and the Teams webhooks; the sandbox's fetch in Figma. */
  fetch: GithubFetch
  sleep(ms: number): Promise<void>
  openExternal(url: string): void
  now(): Date
  /** The signed-in Figma user's name. */
  user(): string
  /** The Figma file's name. */
  fileName(): string
  /** The person's team (their persona), credited on the History entry. */
  team?(): Promise<string>
}

/** Branches whose latest extraction is looked up for the menu; the rest are listed without who / when. */
export const MAX_STAMPED_BRANCHES = 30

const FIELD_LABELS: Record<string, string> = { repo: 'repository', apiKey: 'access token', baseUrl: 'base URL', branch: 'branch', tokenPath: 'token path' }

function problemOf(github: IntegrationValues<'github'>): string | null {
  const config = codeHostConfig(github)
  if (!isProblem(config)) return null
  const fields = config.fields.map((f) => FIELD_LABELS[f] ?? f.toLowerCase()).join(' and ')
  return `${config.reason === 'incomplete' ? 'Add' : 'Fix'} the ${fields} in Settings › Code repository`
}

/** The Teams / Power Automate message for a pushed extraction: prose plus the counts and table rows a flow reads. */
export function channelCard(input: CardInput & { facts: CardFacts; changes: readonly Change[] }): string {
  return cardPayload(input)
}

export function createExtractionHandlers(deps: ExtractionDeps): HandlerMap {
  /** The extraction behind the last compare; a push must name it so it never sends something the designer did not see. */
  let last: { id: string; file: ExtractionFile; changes: readonly Change[]; impacted: readonly ImpactedComponent[]; comparedWith: string | null } | null = null

  async function connect(): Promise<CodeHost> {
    const github = await deps.readGithub()
    const config = codeHostConfig(github)
    if (isProblem(config)) throw new Error(`${problemOf(github)}.`)
    return createCodeHost(config, deps.fetch, deps.sleep)
  }

  async function status(): Promise<StatusResult> {
    const [github, notifications] = await Promise.all([deps.readGithub(), deps.readNotifications()])
    const channels = { designSystem: !!notifications.designSystemWebhook.trim(), devTeam: !!notifications.devTeamWebhook.trim() }
    const problem = problemOf(github)
    if (problem) return { repo: { connected: false, repo: github.repo.trim(), problem }, branches: [], defaultBranch: '', channels }
    const gh = await connect()
    const [me, names] = await Promise.all([gh.whoAmI(), gh.listBranches()])
    // The default branch first: it is what most compares are against.
    const ordered = [...names].sort((a, b) => Number(b === me.defaultBranch) - Number(a === me.defaultBranch) || a.localeCompare(b))
    const branches: BranchInfo[] = await Promise.all(ordered.map(async (name, i) => {
      if (i >= MAX_STAMPED_BRANCHES) return { name, latest: null }
      // A branch whose index can't be read is still listed, just without who / when.
      const index = parseIndex(await gh.readFile(INDEX_PATH, name).catch(() => null))
      return { name, latest: index ? { by: index.latest.by, at: index.latest.at } : null }
    }))
    return { repo: { connected: true, repo: gh.config.repo }, branches, defaultBranch: names.length ? me.defaultBranch : '', channels }
  }

  async function extract(payload: unknown): Promise<ExtractResult> {
    const { branch } = extractRequestSchema.parse(payload)
    const snapshot = await deps.readSnapshot()
    let baseline: ExtractionFile | null = null
    if (branch) {
      const gh = await connect()
      const raw = await gh.readFile(LATEST_PATH, branch)
      baseline = parseExtraction(raw)
      if (raw && !baseline) throw new Error(`${LATEST_PATH} on ${branch} isn’t a Bluebird extraction, so there is nothing to compare with. Pick another branch.`)
    }
    const changes = variableChanges(baseline?.snapshot ?? null, snapshot)
    const impacted = impactedComponents(changes, baseline?.snapshot ?? null, snapshot)
    const now = deps.now()
    const id = `e${now.getTime().toString(36)}`
    const comparedWith = branch && baseline ? `${branch} · ${baseline.extractedBy}, ${baseline.extractedAt.slice(0, 16).replace('T', ' ')} UTC` : null
    last = { id, file: { schema: 1, extractedAt: now.toISOString(), extractedBy: deps.user(), file: deps.fileName(), snapshot }, changes, impacted, comparedWith }
    return {
      extractId: id,
      extractedAt: now.toISOString(),
      branch,
      baseline: baseline ? { by: baseline.extractedBy, at: baseline.extractedAt } : null,
      counts: { variables: snapshot.variables.length, components: snapshot.components.length, modes: new Set(snapshot.variables.flatMap((v) => Object.keys(v.values))).size },
      changes,
      modes: modeCounts(changes),
      impacted,
      message: draftMessage(changes),
    }
  }

  async function notify(pick: { designSystem: boolean; devTeam: boolean }, body: string): Promise<{ posted: number; failed: number; names: string[] }> {
    const n = await deps.readNotifications()
    const urls = [...new Set([pick.designSystem ? n.designSystemWebhook.trim() : '', pick.devTeam ? n.devTeamWebhook.trim() : ''].filter(Boolean))]
    let posted = 0, failed = 0
    const names: string[] = []
    const nameOf = (url: string) => url === n.devTeamWebhook.trim() ? 'Dev team' : 'Design system'
    for (const url of urls) {
      // Only Teams / Power Automate hosts: the URL comes from Settings and carries the change summary.
      if (!allowedWebhook(url)) { failed += 1; continue }
      try {
        // Normalised here, not when Settings is read: nameOf compares against the saved URL.
        const res = await deps.fetch(normalizeWebhook(url), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
        if (res.status >= 200 && res.status < 300) { posted += 1; names.push(nameOf(url)) }
        else failed += 1
      } catch {
        failed += 1
      }
    }
    return { posted, failed, names }
  }

  /** Adds the push to the team History. Never fails the push; returns whether it was recorded. */
  async function remember(reviewed: NonNullable<typeof last>, target: string, message: string, ticket: string, result: PushResult, files: string[], notified: string[], repo: string): Promise<boolean> {
    const team = deps.team ? await deps.team().catch(() => '') : ''
    const entry = extractionEntry({ file: reviewed.file, changes: reviewed.changes, impacted: reviewed.impacted, repo, target, comparedWith: reviewed.comparedWith, message, ticket, team, result, files, notified })
    return (await recordHistory(deps, entry)).recorded
  }

  async function push(payload: unknown): Promise<PushResult> {
    const req = pushRequestSchema.parse(payload)
    if (!last || last.id !== req.extractId) throw new Error('Extract again before pushing — this is no longer the latest extraction.')
    const reviewed = last
    const gh = await connect()
    const [me, names] = await Promise.all([gh.whoAmI(), gh.listBranches()])
    const emptyRepo = names.length === 0
    const exists = names.includes(req.target)
    if (emptyRepo && !req.create) throw new Error(`${gh.config.repo} has no branches yet. Create a new branch for the first push.`)
    if (req.create && exists) throw new Error(`${req.target} already exists. Pick it under Existing branch, or choose another name.`)
    if (!req.create && !exists) throw new Error(`${req.target} is no longer a branch of ${gh.config.repo}. Refresh the branches and pick again.`)
    if (req.pullRequest && (emptyRepo || req.target === me.defaultBranch)) {
      throw new Error(emptyRepo ? 'A pull request needs a branch to merge into. Push to a new branch first.' : `A pull request needs a branch other than ${me.defaultBranch}. Pick another branch or create a new one.`)
    }

    const from = req.create ? (req.base || me.defaultBranch) : req.target
    const message = req.ticket && !req.message.includes(req.ticket) ? `${req.message.trim()} (${req.ticket})` : req.message.trim()
    const path = stampPath(reviewed.file.extractedAt)
    const entry: IndexEntry = {
      at: reviewed.file.extractedAt, by: reviewed.file.extractedBy, file: reviewed.file.file, path,
      variables: reviewed.file.snapshot.variables.length, components: reviewed.file.snapshot.components.length, message,
    }
    const body = `${JSON.stringify(reviewed.file, null, 2)}\n`
    let commitUrl = ''
    try {
      if (emptyRepo) {
        // A one-file write is the only kind that works on an empty repository: it makes the first commit and the branch.
        await gh.putFile(INDEX_PATH, `${JSON.stringify(nextIndex(null, entry), null, 2)}\n`, message, req.target)
      }
      const parent = await gh.branchHead(emptyRepo ? req.target : from)
      const previous = emptyRepo ? null : parseIndex(await gh.readFile(INDEX_PATH, from).catch(() => null))
      const made = await gh.commitFiles({
        parent, message, branch: req.target, create: req.create && !emptyRepo,
        files: [
          { path, content: body },
          { path: LATEST_PATH, content: body },
          { path: INDEX_PATH, content: `${JSON.stringify(nextIndex(previous, entry), null, 2)}\n` },
        ],
      })
      commitUrl = made.url
    } catch (e) {
      if (e instanceof GithubError && e.kind === 'rejected') {
        const rejected: PushResult = { outcome: 'rejected', headline: `Push to ${req.target} was rejected`, message: `${e.message} Nothing was pushed and nobody was notified. Push to a new branch instead.` }
        await remember(reviewed, req.target, message, req.ticket, rejected, [], [], gh.config.repo)
        return rejected
      }
      throw e
    }
    last = null // pushed: the next push needs a fresh extraction

    const lines = summaryLines(reviewed.changes, reviewed.impacted)
    let result: PushResult = { outcome: 'pushed', headline: `Pushed to ${req.target}`, message: lines[0]!, link: commitUrl, linkLabel: 'Open commit' }
    if (req.pullRequest) {
      try {
        const pr = await gh.openPull(req.target, me.defaultBranch, message, [...lines, `Extracted from “${reviewed.file.file}” by ${reviewed.file.extractedBy}.`, ...(req.ticket ? [`Jira: ${req.ticket}`] : [])].join('\n\n'))
        result = { outcome: 'pr-opened', headline: `Pull request #${pr.number} is open`, message: `Pushed to ${req.target}. ${lines[0]}`, link: pr.url, linkLabel: `Open pull request #${pr.number}` }
      } catch (e) {
        const why = e instanceof GithubError && e.kind === 'exists' ? 'a pull request for this branch is already open, and now includes this extraction' : `the pull request could not be opened (${e instanceof Error ? e.message : 'unknown error'})`
        result = { ...result, message: `${lines[0]} Pushed, but ${why}.` }
      }
    }
    let notified: string[] = []
    if (req.notify.designSystem || req.notify.devTeam) {
      const facts: CardFacts = {
        kind: 'extraction', actor: reviewed.file.extractedBy, repo: gh.config.repo, ref: req.target,
        ...countKinds(reviewed.changes), breaking: reviewed.changes.filter((c) => c.breaking).length,
        impacted: reviewed.impacted.map((c) => c.name),
      }
      const card = channelCard({ title: `${reviewed.file.extractedBy} pushed an extraction to ${gh.config.repo} · ${req.target}`, lines: [message, ...lines], facts, changes: reviewed.changes, link: result.link, linkLabel: result.linkLabel })
      const { posted, failed, names } = await notify(req.notify, card)
      const told = posted ? ` ${posted === 1 ? '1 channel was' : `${posted} channels were`} notified.` : ''
      const missed = failed ? ` ${failed === 1 ? '1 channel' : `${failed} channels`} could not be reached.` : ''
      result = { ...result, message: `${result.message}${told}${missed}` }
      notified = names
    }
    const recorded = await remember(reviewed, req.target, message, req.ticket, result, [path, LATEST_PATH, INDEX_PATH], notified, gh.config.repo)
    return recorded ? result : { ...result, message: `${result.message} It could not be added to the team history.` }
  }

  return {
    [MSG.status]: async () => status(),
    [MSG.extract]: async (payload: unknown) => extract(payload),
    [MSG.push]: async (payload: unknown) => push(payload),
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
