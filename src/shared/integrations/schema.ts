// Settings › Integrations wire contract, shared by the sandbox store, the
// shell screen and the mock. Values live in figma.clientStorage under one
// `bluebird:` key, so "Reset all Settings" already clears them.
import * as z from 'zod/mini'
import { normalizeGithubAddress, normalizeJiraAddress, repoFromLink } from './hosts'

export const INTEGRATIONS_MSG = {
  get: 'integrations:get',
  save: 'integrations:save',
  /** Applies a team setup file (see transfer.ts) to the person's stored settings. */
  import: 'integrations:import',
  /** Opens a sign-in page or a token help page in the browser (the sandbox owns figma.openExternal). */
  open: 'integrations:open',
} as const

export const INTEGRATIONS_KEY = 'bluebird:integrations'

/**
 * Sections whose Test Connection is wired. Each is answered by the feature that owns the
 * connection, on `<section>:test`, with the section's unsaved form values as the payload.
 */
export const TESTABLE_INTEGRATIONS: readonly IntegrationId[] = ['jira', 'dualFile', 'ai', 'github', 'storage']
/** `jira:test`, `dual-file:test`: bridge types are lower-case, so camelCase ids become kebab-case. */
export const testMessage = (section: IntegrationId): string => `${section.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}:test`
/** What a passing test reports; a failing one rejects with a readable message. */
export interface ConnectionTestResult { message: string }

export const MAX_TEXT = 2048
export const MAX_INSTRUCTIONS = 8000
const text = () => z.string().check(z.maxLength(MAX_TEXT))

/**
 * Model ids as the providers list them on 2026-10-13 (docs/research/ux-ai-agents-research.md).
 * Dateless Anthropic ids are pinned releases; Gemini 2.5 is deprecated (shutdown listed for
 * 2026-10-16) and kept only for keys that still have it.
 */
export const MODEL_OPTIONS = {
  claude: ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-opus-4-8', 'claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
  openai: ['gpt-5.5', 'gpt-5.4', 'gpt-5.4-mini', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4o'],
  gemini: ['gemini-3.5-flash', 'gemini-3.1-pro-preview', 'gemini-3-flash-preview', 'gemini-3.1-flash-lite', 'gemini-2.5-pro', 'gemini-2.5-flash'],
} as const

/** Which provider answers UX AI and runs the agents. Shown as typed in the Settings select; `@shared/ai` maps it to an id. */
export const PROVIDER_OPTIONS = ['Claude', 'OpenAI', 'Gemini'] as const


/** How often an open plugin checks Storage for teammates' new History entries. */
export const REFRESH_OPTIONS = ['Every minute', 'Every 5 minutes', 'Every 15 minutes', 'Only when I refresh'] as const
export type RefreshOption = (typeof REFRESH_OPTIONS)[number]
/** Milliseconds between automatic checks; 0 = never. */
export const REFRESH_MS: Readonly<Record<RefreshOption, number>> = { 'Every minute': 60_000, 'Every 5 minutes': 300_000, 'Every 15 minutes': 900_000, 'Only when I refresh': 0 }
export const refreshMs = (value: string): number => REFRESH_MS[value as RefreshOption] ?? 60_000

/** What a Dual File slot holds: one library file can carry variables, components, or both. */
export const FILE_ROLES = ['Variables', 'Components', 'Variables + Components'] as const
export type FileRole = (typeof FILE_ROLES)[number]

/**
 * One Dual File library file: the name the person gives it, its Figma file key (a pasted
 * figma.com URL is stored as the key) and what it holds. Every file is read with the one token.
 */
export const libraryFileEntrySchema = z.object({ name: text(), id: text(), role: text() })
export type LibraryFileEntry = z.infer<typeof libraryFileEntrySchema>
/** Settings › Dual File Mode › Add file stops here: every file is a REST read per role. */
export const MAX_LIBRARY_FILES = 3
/** "File 2": what a file is called until the person names it. */
export const defaultFileName = (index: number): string => `File ${index + 1}`
/** A row as Add file creates it. The first file holds both; later ones usually a components library. */
export const newLibraryFile = (index: number): LibraryFileEntry => ({ name: defaultFileName(index), id: '', role: index === 0 ? 'Variables + Components' : 'Components' })

/**
 * MCP hand-off scenarios (Settings › MCP + code sync). Each has its own repository and token, so
 * each team connects only the scenario it works on.
 */
export const MCP_SCENARIOS = ['component', 'screen', 'library'] as const
export type McpScenario = (typeof MCP_SCENARIOS)[number]
/** What the hand-off prompt asks Claude Code to write in. */
export const MCP_FRAMEWORKS = ['React + TypeScript', 'Preact + TypeScript', 'Vue + TypeScript', 'Angular', 'Web components'] as const
/** How a library update is split into pull requests. */
export const MCP_PULL_REQUESTS = ['One per screen', 'One for all screens'] as const

/**
 * How a GitHub or Jira section connects (Settings › Connection card): a token the person pastes, or a sign-in
 * through a Bluebird broker (Bluebird Cloud, or the company's gateway) that leaves a token in the same field.
 */
export const CONNECT_METHODS = ['token', 'signin'] as const
export type ConnectMethod = (typeof CONNECT_METHODS)[number]

export const sectionSchemas = {
  github: z.object({
    apiKey: text(), repo: text(), branch: text(), tokenPath: text(), baseUrl: text(), diffComparison: z.boolean(),
    /** One of CONNECT_METHODS; absent in settings stored before 2026-11-26 → token. */
    method: z._default(text(), 'token'),
    /** The company's Bluebird gateway: where sign-in goes when the GitHub is only reachable on the VPN. */
    gatewayUrl: z._default(text(), ''),
    /** Who signed in ("@maria-r") and when that sign-in expires (ISO); both empty for a pasted token. */
    signinAccount: z._default(text(), ''),
    signinExpires: z._default(text(), ''),
  }),
  notifications: z.object({ designSystemWebhook: text(), devTeamWebhook: text(), outlookWebhook: text(), emails: text() }),
  storybook: z.object({ baseUrl: text(), storyPathTemplate: text(), indexUrl: text(), linksEnabled: z.boolean() }),
  zeroheight: z.object({ apiKey: text(), styleguideId: text(), publicBaseUrl: text(), linksEnabled: z.boolean() }),
  dualFile: z.object({
    enabled: z.boolean(),
    /** One Figma personal access token opens every file below. */
    token: text(),
    files: z.array(libraryFileEntrySchema).check(z.maxLength(MAX_LIBRARY_FILES)),
  }),
  ai: z.object({
    enabled: z.boolean(),
    /** One of PROVIDER_OPTIONS: the provider whose model and key answer. Absent in stored settings from before it existed → Claude. */
    provider: z._default(text(), 'Claude'),
    claudeModel: text(), claudeKey: text(),
    openaiModel: text(), openaiKey: text(),
    geminiModel: text(), geminiKey: text(),
    managedAgents: z.boolean(),
    instructions: z.string().check(z.maxLength(MAX_INSTRUCTIONS)),
  }),
  /** One repository, branch and token per scenario (`<scenario>Repo`, …); the GitHub Enterprise host is shared. */
  mcp: z.object({
    enabled: z.boolean(),
    componentRepo: text(), componentBranch: text(), componentToken: text(), componentFramework: text(), componentFolder: text(),
    screenRepo: text(), screenBranch: text(), screenToken: text(), screenFramework: text(), screenFolder: text(), screenPackage: text(),
    libraryRepo: text(), libraryBranch: text(), libraryToken: text(), libraryPullRequests: text(),
    enterpriseUrl: text(),
  }),
  /** `proxyUrl` is the company gateway (Settings › Use a company gateway), or the local proxy in development. */
  jira: z.object({
    enabled: z.boolean(), projectKey: text(), apiKey: text(), email: text(), siteUrl: text(), baseUrl: text(), proxyUrl: text(),
    method: z._default(text(), 'token'),
    signinAccount: z._default(text(), ''),
    signinExpires: z._default(text(), ''),
  }),
  /**
   * Where the team History lives: a GitHub repository every designer's plugin reads and writes.
   * `sameAsGithub` borrows the repository and token from the GitHub section; the folder is its own.
   */
  storage: z.object({ sameAsGithub: z.boolean(), apiKey: text(), repo: text(), branch: text(), baseUrl: text(), folder: text(), refresh: text() }),
}

export type IntegrationId = keyof typeof sectionSchemas
export type IntegrationValues<K extends IntegrationId = IntegrationId> = z.infer<(typeof sectionSchemas)[K]>
export type IntegrationSettings = { [K in IntegrationId]: IntegrationValues<K> }

export const INTEGRATION_IDS = Object.keys(sectionSchemas) as IntegrationId[]

/**
 * Keys and tokens. Each person enters these in the plugin: a brand can manage every other
 * field from plugin.config.json, which is committed and inlined into the plugin bundle.
 */
export const SECRET_FIELDS: { readonly [K in IntegrationId]: readonly (keyof IntegrationValues<K>)[] } = {
  github: ['apiKey'],
  // Power Automate / Teams workflow URLs carry a sig= signature: anyone holding one can post.
  notifications: ['designSystemWebhook', 'devTeamWebhook', 'outlookWebhook'],
  storybook: [],
  zeroheight: ['apiKey'],
  dualFile: ['token'],
  ai: ['claudeKey', 'openaiKey', 'geminiKey'],
  mcp: ['componentToken', 'screenToken', 'libraryToken'],
  jira: ['apiKey'],
  storage: ['apiKey'],
}

export const isSecretField = (section: IntegrationId, key: string): boolean => (SECRET_FIELDS[section] as readonly string[]).includes(key)

/** Brand-managed sections (plugin.config.json → brand.brands.<id>.integrations): a section listed here is set by the brand; its keys are locked in the plugin. */
export type ManagedIntegrations = { [K in IntegrationId]?: Partial<IntegrationValues<K>> }

/** Values a brand manages win over what the person stored; secret fields are never managed, so they always come from the person. */
export function applyManaged(settings: IntegrationSettings, managed: ManagedIntegrations | undefined): IntegrationSettings {
  if (!managed) return settings
  const out = { ...settings }
  for (const id of INTEGRATION_IDS) {
    const values = managed[id]
    if (!values) continue
    const locked = Object.fromEntries(Object.entries(values).filter(([k]) => !isSecretField(id, k)))
    ;(out as Record<IntegrationId, unknown>)[id] = { ...settings[id], ...locked }
  }
  return out
}

/** First-run values: switches as the Figma screen shows them, selects on the Figma value, text empty. */
export const DEFAULT_INTEGRATIONS: IntegrationSettings = {
  github: { apiKey: '', repo: '', branch: 'main', tokenPath: 'tokens.json', baseUrl: '', diffComparison: true, method: 'token', gatewayUrl: '', signinAccount: '', signinExpires: '' },
  notifications: { designSystemWebhook: '', devTeamWebhook: '', outlookWebhook: '', emails: '' },
  storybook: { baseUrl: '', storyPathTemplate: '', indexUrl: '', linksEnabled: true },
  zeroheight: { apiKey: '', styleguideId: '', publicBaseUrl: '', linksEnabled: true },
  dualFile: { enabled: true, token: '', files: [newLibraryFile(0)] },
  ai: { enabled: true, provider: 'Claude', claudeModel: 'claude-opus-5-5', claudeKey: '', openaiModel: 'gpt-5.5', openaiKey: '', geminiModel: 'gemini-3.5-flash', geminiKey: '', managedAgents: true, instructions: '' },
  mcp: {
    enabled: true,
    componentRepo: '', componentBranch: 'main', componentToken: '', componentFramework: 'React + TypeScript', componentFolder: 'src/components',
    screenRepo: '', screenBranch: 'main', screenToken: '', screenFramework: 'React + TypeScript', screenFolder: 'src/pages', screenPackage: '',
    libraryRepo: '', libraryBranch: 'main', libraryToken: '', libraryPullRequests: 'One per screen',
    enterpriseUrl: '',
  },
  jira: { enabled: false, projectKey: '', apiKey: '', email: '', siteUrl: '', baseUrl: '', proxyUrl: '', method: 'token', signinAccount: '', signinExpires: '' },
  storage: { sameAsGithub: true, apiKey: '', repo: '', branch: 'main', baseUrl: '', folder: '.bluebird/history', refresh: 'Every minute' },
}

export const saveRequestSchema = z.object({ section: z.enum(INTEGRATION_IDS as [IntegrationId, ...IntegrationId[]]), values: z.unknown() })
export type SaveIntegrationRequest<K extends IntegrationId = IntegrationId> = { section: K; values: IntegrationValues<K> }

// figma.com/design/<key>/…, /file/, /proto/, /board/ — also with a branch: /design/<key>/branch/<branchKey>/…
const FIGMA_FILE_URL = /^(?:https?:\/\/)?(?:www\.)?figma\.com\/(?:design|file|proto|board)\/([A-Za-z0-9]+)(?:\/branch\/([A-Za-z0-9]+))?/

/**
 * A pasted Figma file URL becomes its file key; anything else is left as typed. A branch URL gives
 * the main file's key: libraries are published from the main file, and the published components,
 * styles and Library Analytics endpoints refuse a branch key.
 */
export function figmaFileKey(value: string): string {
  const match = FIGMA_FILE_URL.exec(value.trim())
  return match ? match[1]! : value.trim()
}

/** Trims a library file row; a pasted figma.com URL becomes its file key and a blank name becomes "File n". */
const normalizeFile = (f: Partial<LibraryFileEntry>, i: number): LibraryFileEntry => ({
  name: (f.name ?? '').trim() || defaultFileName(i),
  id: figmaFileKey(f.id ?? ''),
  role: (f.role ?? '').trim(),
})

/** Trims every text value (pasted keys and URLs often carry spaces); Dual File rows also accept the whole file URL. */
export function normalizeIntegration<K extends IntegrationId>(values: IntegrationValues<K>, section?: K): IntegrationValues<K> {
  const out = Object.fromEntries(Object.entries(values).map(([k, v]) => {
    if (section === 'dualFile' && k === 'files' && Array.isArray(v)) return [k, (v as Partial<LibraryFileEntry>[]).map(normalizeFile)]
    return [k, typeof v === 'string' ? v.trim() : v]
  })) as Record<string, unknown>
  if (section === 'github') return normalizeGithub(out) as IntegrationValues<K>
  if (section === 'jira') return normalizeJira(out) as IntegrationValues<K>
  return out as IntegrationValues<K>
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '')

/** "Where's your GitHub?" takes a bare host or a repository link: it keeps the host, and fills an empty repository from the link. */
function normalizeGithub(v: Record<string, unknown>): Record<string, unknown> {
  const typed = str(v.baseUrl)
  if (!typed) return v
  const repo = str(v.repo) || repoFromLink(typed) || ''
  return { ...v, baseUrl: normalizeGithubAddress(typed), repo }
}

/** Jira addresses lose any path and gain https:// when typed bare ("acme.atlassian.net"). */
function normalizeJira(v: Record<string, unknown>): Record<string, unknown> {
  return { ...v, siteUrl: str(v.siteUrl) && normalizeJiraAddress(str(v.siteUrl)), baseUrl: str(v.baseUrl) && normalizeJiraAddress(str(v.baseUrl)) }
}

type OldSlot = readonly [id: string, key: string, role: string]
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** The slots of a Dual File stored before 2026-11-14, oldest shape first; null when `old` is already the current shape. */
function oldSlots(old: Record<string, unknown>): OldSlot[] | null {
  const str = (k: string, from: Record<string, unknown> = old) => (typeof from[k] === 'string' ? (from[k] as string).trim() : '')
  if ('variablesFileId' in old || 'componentsFileId' in old) {
    return [[str('variablesFileId'), str('variablesApiKey'), 'Variables'], [str('componentsFileId'), str('componentsApiKey'), 'Components']]
  }
  if (!('file1Id' in old || 'file2Id' in old || 'extraFiles' in old)) return null
  const extras = Array.isArray(old.extraFiles) ? old.extraFiles.filter(isRecord).map((f): OldSlot => [str('id', f), str('key', f), str('role', f)]) : []
  return [[str('file1Id'), str('file1Key'), str('file1Role') || 'Variables'], [str('file2Id'), str('file2Key'), str('file2Role') || 'Components'], ...extras]
}

/**
 * Dual File as stored before one token + named files: File 1 / File 2 (each with its own key) and
 * extra files, or the even older Variables file / Components file pair. The first key becomes the
 * token and the first three files with an ID are kept, named File 1…3.
 */
export function migrateDualFile(stored: unknown): unknown {
  if (!isRecord(stored) || 'files' in stored) return stored
  const slots = oldSlots(stored)
  if (!slots) return stored
  const listed = slots.filter(([id]) => id !== '').slice(0, MAX_LIBRARY_FILES)
  return {
    ...(typeof stored.enabled === 'boolean' ? { enabled: stored.enabled } : {}),
    token: slots.map(([, key]) => key).find((key) => key !== '') ?? '',
    files: listed.length ? listed.map(([id, , role], i) => ({ name: defaultFileName(i), id, role })) : [newLibraryFile(0)],
  }
}

/**
 * MCP + code sync as stored before one repository per scenario (2026-11-15): a single repository,
 * base branch and token. That repository was the Storybook one, so it becomes the Component scenario's.
 */
export function migrateMcp(stored: unknown): unknown {
  if (!isRecord(stored) || 'componentRepo' in stored) return stored
  if (!('repo' in stored || 'token' in stored || 'baseBranch' in stored)) return stored
  const str = (k: string) => (typeof stored[k] === 'string' ? (stored[k] as string).trim() : '')
  return {
    ...(typeof stored.enabled === 'boolean' ? { enabled: stored.enabled } : {}),
    componentRepo: str('repo'),
    componentBranch: str('baseBranch') || 'main',
    componentToken: str('token'),
    enterpriseUrl: str('enterpriseUrl'),
  }
}

const MIGRATIONS: Partial<Record<IntegrationId, (stored: unknown) => unknown>> = { dualFile: migrateDualFile, mcp: migrateMcp }

/** Stored settings over the defaults, section by section; a section that no longer parses falls back to its defaults. */
export function mergeIntegrations(stored: unknown): IntegrationSettings {
  const source = typeof stored === 'object' && stored !== null ? stored as Record<string, unknown> : {}
  const out = { ...DEFAULT_INTEGRATIONS }
  for (const id of INTEGRATION_IDS) {
    const stored = (MIGRATIONS[id] ?? ((v: unknown) => v))(source[id])
    const parsed = z.safeParse(sectionSchemas[id], { ...DEFAULT_INTEGRATIONS[id], ...(stored as object | undefined) })
    if (parsed.success) (out as Record<IntegrationId, unknown>)[id] = parsed.data
  }
  return out
}
