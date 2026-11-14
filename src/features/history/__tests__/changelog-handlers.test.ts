import { describe, it, expect } from 'vitest'
import { DEFAULT_INTEGRATIONS } from '@shared/integrations'
import type { HandlerContext } from '@shared/bridge'
import type { Snapshot } from '@shared/design/types'
import { decodeBase64 } from '@shared/github/base64'
import { parseDay } from '@shared/history/store'
import type { HistoryEntry } from '@shared/history/types'
import { CHANGELOG, type ApproveResult, type ChangelogContext, type ChangelogDraft, type SubmitResult, type TicketsResult } from '../messages'
import { NOT_A_BRANCH, NO_KEY, NO_TOKEN, createChangelogHandlers } from '../sandbox/changelog-handlers'
import { dualFileWith } from '@shared/integrations/testing'

const LOCAL: Snapshot = {
  takenAt: '2026-11-12T10:00:00.000Z',
  variables: [{ id: 'v1', name: 'button/bg', collection: 'Brand UI', type: 'color', values: { Bridge: '#0052CC' }, description: '' }],
  components: [{ id: 'k-button', nodeId: '1:2', name: 'Button', page: 'Atoms', variants: 2, properties: ['State'], description: '', usesVariables: ['v1'] }],
}

interface Options { fileKey?: string | null; token?: string; branch?: boolean; storage?: boolean; drawFails?: boolean; conflicts?: number; figmaDown?: boolean; jira?: boolean; jiraDown?: boolean; teams?: string; outlook?: string }

function setup({ fileKey = 'BRANCH', token = 'figd_x', branch = true, storage = true, drawFails = false, conflicts = 0, figmaDown = false, jira = true, jiraDown = false, teams = 'https://prod-1.westus.logic.azure.com/workflows/t?sig=1', outlook = '' }: Options = {}) {
  const files = new Map<string, string>()
  const comments: { key: string; text: string }[] = []
  const posts: { url: string; body: string }[] = []
  const drawn: HistoryEntry[] = []
  const tokens = new Set<string>()
  let pending = conflicts
  let clock = Date.parse('2026-11-12T12:00:00.000Z')
  const reply = (status: number, body: unknown) => ({ status, text: async () => JSON.stringify(body) })
  const handlers = createChangelogHandlers({
    readSnapshot: async () => LOCAL,
    readDualFile: async () => dualFileWith(['LIB', 'MAIN'], token),
    readGithub: async () => ({ ...DEFAULT_INTEGRATIONS.github, repo: 'acme/ds', branch: 'main', apiKey: storage ? 'ghp_x' : '' }),
    readStorage: async () => DEFAULT_INTEGRATIONS.storage,
    readJira: async () => ({ ...DEFAULT_INTEGRATIONS.jira, enabled: jira, siteUrl: 'https://acme.atlassian.net', email: 'p@acme.com', apiKey: 'jira-token', projectKey: 'BB' }),
    readNotifications: async () => ({ ...DEFAULT_INTEGRATIONS.notifications, designSystemWebhook: teams, outlookWebhook: outlook }),
    fetch: async (url: string, init: { method: string; headers: Record<string, string>; body?: string }) => {
      if (url.startsWith('https://acme.atlassian.net/')) {
        if (jiraDown) return reply(401, {})
        if (url.endsWith('/search/jql')) return reply(200, { issues: [{ key: 'BB-342', fields: { summary: 'Darker primary', status: { name: 'In Progress' } } }] })
        const m = /\/issue\/([^/]+)\/comment$/.exec(url)
        if (m && init.method === 'POST') {
          const body = JSON.parse(init.body ?? '{}') as { body: { content: { content: { text?: string }[] }[] } }
          comments.push({ key: decodeURIComponent(m[1]!), text: body.body.content.map((p) => p.content.map((n) => n.text ?? '\n').join('')).join('\n\n') })
          return reply(201, {})
        }
        return reply(404, {})
      }
      if (url.includes('logic.azure.com') || url.includes('webhook.office.com')) { posts.push({ url, body: init.body ?? '' }); return reply(202, {}) }
      if (url.startsWith('https://api.figma.com/')) {
        if (figmaDown) return reply(500, { err: 'boom' })
        tokens.add(init.headers['X-Figma-Token'] ?? '')
        if (url.includes('/files/BRANCH?')) return reply(200, branch ? { name: 'button-refresh', mainFileKey: 'MAIN' } : { name: 'Library' })
        if (url.endsWith('/files/MAIN/meta')) return reply(200, { file: { name: 'Project Bluebird UI' } })
        if (url.endsWith('/variables/local')) return reply(200, { meta: { variableCollections: { c: { id: 'c', name: 'Brand UI', defaultModeId: 'm', modes: [{ modeId: 'm', name: 'Bridge' }] } }, variables: { v1: { id: 'v1', key: 'k', name: 'button/bg', variableCollectionId: 'c', resolvedType: 'COLOR', valuesByMode: { m: { r: 0, g: 0.4, b: 1, a: 1 } } } } } })
        if (url.includes('/nodes?')) return reply(200, { nodes: { '1:2': null } })
        if (url.endsWith('/component_sets')) return reply(200, { meta: { component_sets: [] } })
        return reply(200, { meta: { components: [] } })
      }
      const path = decodeURIComponent(/\/contents\/([^?]+)/.exec(url)?.[1] ?? '')
      if (init.method === 'PUT') {
        if (path.endsWith('.md') && pending > 0) { pending -= 1; return reply(409, { message: 'is at a different sha' }) }
        files.set(path, decodeBase64((JSON.parse(init.body ?? '{}') as { content: string }).content))
        return reply(200, {})
      }
      const text = files.get(path)
      return text === undefined ? reply(404, { message: 'Not Found' }) : reply(200, { content: btoa(unescape(encodeURIComponent(text))), sha: `sha${text.length}` })
    },
    sleep: async () => undefined,
    now: () => new Date(clock += 60_000),
    user: () => 'Praveen Manchi',
    team: async () => 'Design System',
    fileKey: () => fileKey,
    fileName: () => 'button-refresh',
    pageName: () => 'Atoms',
    drawCard: async (entry) => { if (drawFails) throw new Error('no font'); drawn.push(entry) },
  })
  const call = <T>(type: string, payload?: unknown) => (handlers[type] as (p: unknown, c: HandlerContext) => Promise<T>)(payload, {} as HandlerContext)
  const day = () => parseDay(files.get('.bluebird/history/2026-11-12.json') ?? null)
  return {
    files, drawn, tokens, day, comments, posts,
    context: () => call<ChangelogContext>(CHANGELOG.context),
    generate: () => call<ChangelogDraft>(CHANGELOG.generate),
    tickets: () => call<TicketsResult>(CHANGELOG.tickets),
    submit: (over: Record<string, unknown> = {}) => call<SubmitResult>(CHANGELOG.submit, { draftId: 'x', title: 'Button refresh', notes: 'Darker primary.', ticket: 'BB-342', addCard: true, postToJira: false, notify: { teams: false, outlook: false }, ...over }),
    approve: (e: { id: string; at: string }, postToJira = false) => call<ApproveResult>(CHANGELOG.approve, { id: e.id, at: e.at, postToJira }),
  }
}

describe('changelog handlers', () => {
  it('says where you are and names the main file of a branch', async () => {
    const t = setup()
    expect(await t.context()).toEqual({ file: 'button-refresh', page: 'Atoms', user: 'Praveen Manchi', main: 'Project Bluebird UI', channels: { teams: true, outlook: false }, jira: { connected: true } })
    // One Dual File token reads this file and its main file.
    expect([...t.tokens]).toEqual(['figd_x'])
  })

  it('explains why there is nothing to compare with', async () => {
    expect((await setup({ fileKey: null }).context()).problem).toBe(NO_KEY)
    expect((await setup({ token: '' }).context()).problem).toBe(NO_TOKEN)
    expect((await setup({ branch: false }).context()).problem).toBe(NOT_A_BRANCH)
    expect((await setup({ figmaDown: true }).context()).problem).toMatch(/Figma answered 500/)
    await expect(setup({ branch: false }).generate()).rejects.toThrow(NOT_A_BRANCH)
  })

  it('compares the branch with its main file', async () => {
    const draft = await setup().generate()
    expect(draft.title).toBe('button-refresh')
    expect(draft.branch).toBe('https://www.figma.com/design/MAIN/branch/BRANCH/button-refresh')
    expect(draft.warnings).toEqual([])
    expect(draft.changes.map((c) => `${c.subject} ${c.kind} ${c.name} ${c.detail}`)).toEqual(['component added Button New · 2 variants · 1 property', 'variable modified button/bg #0066FF → #0052CC'])
  })

  it('submits what was compared as under review and draws the card', async () => {
    const t = setup()
    const draft = await t.generate()
    const done = await t.submit({ draftId: draft.draftId })
    expect(done).toMatchObject({ card: true, message: 'Submitted for review. Your team sees it in History as Under review. The changelog card is on this page.' })
    const [entry] = t.day()
    expect(entry).toMatchObject({ id: done.id, type: 'changelog', status: 'review', title: 'Button refresh', ticket: 'BB-342', by: { name: 'Praveen Manchi', team: 'Design System' }, variables: '1 modified', components: '1 added' })
    expect(t.drawn.map((e) => e.id)).toEqual([done.id])
    await expect(t.submit({ draftId: draft.draftId })).rejects.toThrow(/Generate the changelog again/)
  })

  it('keeps the entry when the card can’t be drawn, and skips the card when asked', async () => {
    const t = setup({ drawFails: true })
    expect((await t.submit({ draftId: (await t.generate()).draftId })).message).toMatch(/could not be drawn/)
    expect(t.day()).toHaveLength(1)
    const quiet = setup()
    const done = await quiet.submit({ draftId: (await quiet.generate()).draftId, addCard: false, ticket: '' })
    expect(done).toMatchObject({ card: false, message: 'Submitted for review. Your team sees it in History as Under review.' })
    expect(quiet.drawn).toEqual([])
  })

  it('refuses a submit it did not compare, a bad ticket and a missing repository', async () => {
    const t = setup()
    await expect(t.submit()).rejects.toThrow(/Generate the changelog again/)
    await expect(t.submit({ ticket: 'not a key' })).rejects.toThrow()
    const off = setup({ storage: false })
    await expect(off.submit({ draftId: (await off.generate()).draftId })).rejects.toThrow(/Settings › GitHub/)
  })

  it('approves: the entry is done and the shared changelog file gets it on top', async () => {
    const t = setup({ conflicts: 1 })
    await t.submit({ draftId: (await t.generate()).draftId })
    const [pending] = t.day()
    const done = await t.approve(pending!)
    expect(done.message).toBe('Approved. “Button refresh” is now in acme/ds · .bluebird/DESIGN-CHANGELOG.md.')
    expect(t.day()).toHaveLength(1)
    expect(t.day()[0]).toMatchObject({ status: 'done', review: { by: 'Praveen Manchi' }, link: { url: 'https://github.com/acme/ds/blob/main/.bluebird/DESIGN-CHANGELOG.md' } })
    const md = t.files.get('.bluebird/DESIGN-CHANGELOG.md')!
    expect(md.startsWith('# Design changelog\n\n## 2026-11-12 · Button refresh (BB-342)')).toBe(true)
    expect(md).toContain('- Approved by: Praveen Manchi')
    await expect(t.approve(pending!)).rejects.toThrow('Praveen Manchi already approved this changelog.')
    await expect(t.approve({ id: 'missing1', at: pending!.at })).rejects.toThrow(/no longer in the team history/)
  })

  it('leaves the entry under review when the changelog file can’t be written', async () => {
    const t = setup({ conflicts: 99 })
    await t.submit({ draftId: (await t.generate()).draftId })
    await expect(t.approve(t.day()[0]!)).rejects.toThrow()
    expect(t.day()[0]!.status).toBe('review')
  })

  it('lists the Jira project’s open tickets, or says why it can’t', async () => {
    expect(await setup().tickets()).toEqual({ tickets: [{ key: 'BB-342', title: 'Darker primary', status: 'In Progress' }] })
    expect((await setup({ jira: false }).tickets()).problem).toMatch(/Jira is switched off/)
    expect((await setup({ jiraDown: true }).tickets()).problem).toMatch(/rejected the email or API token/)
    expect((await setup({ jira: false }).context()).jira).toEqual({ connected: false, problem: expect.stringMatching(/switched off/) })
  })

  it('posts the changes and the branch link to the ticket, and notifies the reviewers', async () => {
    const t = setup({ outlook: 'https://acme.webhook.office.com/webhookb2/o' })
    const done = await t.submit({ draftId: (await t.generate()).draftId, postToJira: true, notify: { teams: true, outlook: true } })
    expect(done.message).toContain('BB-342 got a Jira comment with the changes and the Figma branch link.')
    expect(done.message).toContain('Microsoft Teams and Outlook were notified.')
    expect(t.comments).toHaveLength(1)
    expect(t.comments[0]!.key).toBe('BB-342')
    expect(t.comments[0]!.text).toContain('Changelog sent for review: Button refresh')
    expect(t.comments[0]!.text).toContain('button/bg modified #0066FF → #0052CC')
    expect(t.comments[0]!.text).toContain('Figma branch: https://www.figma.com/design/MAIN/branch/BRANCH/button-refresh')
    expect(t.posts.map((p) => p.url)).toEqual(['https://prod-1.westus.logic.azure.com/workflows/t?sig=1', 'https://acme.webhook.office.com/webhookb2/o'])
    expect(JSON.parse(t.posts[0]!.body)).toMatchObject({ title: 'Changelog for review: Button refresh' })
    // The branch link is kept on the entry, for the reviewer's comment.
    expect(t.day()[0]!.details?.facts).toContainEqual({ label: 'Figma branch', value: 'https://www.figma.com/design/MAIN/branch/BRANCH/button-refresh' })
  })

  it('still submits when Jira refuses the comment, and never posts to an unknown host', async () => {
    const t = setup({ jiraDown: true, teams: 'https://evil.example.com/hook' })
    const done = await t.submit({ draftId: (await t.generate()).draftId, postToJira: true, notify: { teams: true, outlook: true } })
    expect(done.message).toMatch(/BB-342 was not updated: Jira rejected/)
    expect(done.message).toContain('Microsoft Teams could not be reached.')
    expect(t.posts).toEqual([])
    expect(t.day()).toHaveLength(1)
  })

  it('posts the approval to the ticket when the reviewer asks', async () => {
    const t = setup()
    await t.submit({ draftId: (await t.generate()).draftId })
    const done = await t.approve(t.day()[0]!, true)
    expect(done.message).toContain('BB-342 got a Jira comment with the approval and the Figma branch link.')
    expect(t.comments[0]!.text).toContain('Changelog approved: Button refresh')
    expect(t.comments[0]!.text).toContain('Added to the design changelog: https://github.com/acme/ds/blob/main/.bluebird/DESIGN-CHANGELOG.md')
  })
})
