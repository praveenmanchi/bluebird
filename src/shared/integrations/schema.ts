// Settings › Integrations wire contract, shared by the sandbox store, the
// shell screen and the mock. Values live in figma.clientStorage under one
// `bluebird:` key, so "Reset all Settings" already clears them.
import * as z from 'zod/mini'

export const INTEGRATIONS_MSG = {
  get: 'integrations:get',
  save: 'integrations:save',
} as const

export const INTEGRATIONS_KEY = 'bluebird:integrations'

/**
 * Sections whose Test Connection is wired. Each is answered by the feature that owns the
 * connection, on `<section>:test`, with the section's unsaved form values as the payload.
 */
export const TESTABLE_INTEGRATIONS: readonly IntegrationId[] = ['jira', 'dualFile', 'ai', 'github']
/** `jira:test`, `dual-file:test`: bridge types are lower-case, so camelCase ids become kebab-case. */
export const testMessage = (section: IntegrationId): string => `${section.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}:test`
/** What a passing test reports; a failing one rejects with a readable message. */
export interface ConnectionTestResult { message: string }

export const MAX_TEXT = 2048
export const MAX_INSTRUCTIONS = 8000
const text = () => z.string().check(z.maxLength(MAX_TEXT))

export const MODEL_OPTIONS = {
  claude: ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-4-5', 'claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'],
  openai: ['gpt-4o', 'gpt-4.1', 'o3'],
  gemini: ['gemini-1.5-pro', 'gemini-2.5-pro', 'gemini-2.5-flash'],
} as const

export const OUTPUT_FORMATS = ['style-dictionary', 'tokens-studio', 'raw-json'] as const

/** What a Dual File slot holds: one library file can carry variables, components, or both. */
export const FILE_ROLES = ['Variables', 'Components', 'Variables + Components'] as const
export type FileRole = (typeof FILE_ROLES)[number]

export const sectionSchemas = {
  github: z.object({ apiKey: text(), repo: text(), branch: text(), tokenPath: text(), baseUrl: text(), diffComparison: z.boolean() }),
  notifications: z.object({ designSystemWebhook: text(), devTeamWebhook: text(), emails: text() }),
  storybook: z.object({ baseUrl: text(), storyPathTemplate: text(), indexUrl: text(), linksEnabled: z.boolean() }),
  zeroheight: z.object({ apiKey: text(), styleguideId: text(), publicBaseUrl: text(), linksEnabled: z.boolean() }),
  dualFile: z.object({
    enabled: z.boolean(),
    file1Id: text(), file1Key: text(), file1Role: text(),
    file2Id: text(), file2Key: text(), file2Role: text(),
  }),
  ai: z.object({
    enabled: z.boolean(),
    claudeModel: text(), claudeKey: text(),
    openaiModel: text(), openaiKey: text(),
    geminiModel: text(), geminiKey: text(),
    managedAgents: z.boolean(),
    instructions: z.string().check(z.maxLength(MAX_INSTRUCTIONS)),
  }),
  mcp: z.object({ enabled: z.boolean(), repo: text(), baseBranch: text(), token: text(), filePath: text(), outputFormat: text(), branchTemplate: text(), enterpriseUrl: text() }),
  jira: z.object({ enabled: z.boolean(), projectKey: text(), apiKey: text(), email: text(), siteUrl: text(), baseUrl: text(), proxyUrl: text() }),
}

export type IntegrationId = keyof typeof sectionSchemas
export type IntegrationValues<K extends IntegrationId = IntegrationId> = z.infer<(typeof sectionSchemas)[K]>
export type IntegrationSettings = { [K in IntegrationId]: IntegrationValues<K> }

export const INTEGRATION_IDS = Object.keys(sectionSchemas) as IntegrationId[]

/** First-run values: switches as the Figma screen shows them, selects on the Figma value, text empty. */
export const DEFAULT_INTEGRATIONS: IntegrationSettings = {
  github: { apiKey: '', repo: '', branch: 'main', tokenPath: 'tokens.json', baseUrl: '', diffComparison: true },
  notifications: { designSystemWebhook: '', devTeamWebhook: '', emails: '' },
  storybook: { baseUrl: '', storyPathTemplate: '', indexUrl: '', linksEnabled: true },
  zeroheight: { apiKey: '', styleguideId: '', publicBaseUrl: '', linksEnabled: true },
  dualFile: { enabled: true, file1Id: '', file1Key: '', file1Role: 'Variables', file2Id: '', file2Key: '', file2Role: 'Components' },
  ai: { enabled: true, claudeModel: 'claude-opus-4-5', claudeKey: '', openaiModel: 'gpt-4o', openaiKey: '', geminiModel: 'gemini-1.5-pro', geminiKey: '', managedAgents: true, instructions: '' },
  mcp: { enabled: true, repo: '', baseBranch: 'main', token: '', filePath: 'src/tokens/design-tokens.json', outputFormat: '', branchTemplate: '', enterpriseUrl: '' },
  jira: { enabled: false, projectKey: '', apiKey: '', email: '', siteUrl: '', baseUrl: '', proxyUrl: '' },
}

export const saveRequestSchema = z.object({ section: z.enum(INTEGRATION_IDS as [IntegrationId, ...IntegrationId[]]), values: z.unknown() })
export type SaveIntegrationRequest<K extends IntegrationId = IntegrationId> = { section: K; values: IntegrationValues<K> }

// figma.com/design/<key>/…, /file/, /proto/, /board/ — also with a branch: /design/<key>/branch/<branchKey>/…
const FIGMA_FILE_URL = /^(?:https?:\/\/)?(?:www\.)?figma\.com\/(?:design|file|proto|board)\/([A-Za-z0-9]+)(?:\/branch\/([A-Za-z0-9]+))?/

/** A pasted Figma file URL becomes its file key (the branch key for a branch URL); anything else is left as typed. */
export function figmaFileKey(value: string): string {
  const match = FIGMA_FILE_URL.exec(value.trim())
  return match ? (match[2] ?? match[1]!) : value.trim()
}

const FILE_ID_FIELDS = new Set(['file1Id', 'file2Id'])

/** Trims every text value (pasted keys and URLs often carry spaces); Dual File IDs also accept the whole file URL. */
export function normalizeIntegration<K extends IntegrationId>(values: IntegrationValues<K>, section?: K): IntegrationValues<K> {
  return Object.fromEntries(Object.entries(values).map(([k, v]) => {
    if (typeof v !== 'string') return [k, v]
    return [k, section === 'dualFile' && FILE_ID_FIELDS.has(k) ? figmaFileKey(v) : v.trim()]
  })) as IntegrationValues<K>
}

/**
 * Dual File stored before the per-file "Contains" select: a Variables file and a Components file.
 * They become File 1 (Variables) and File 2 (Components), so nothing typed earlier is lost.
 */
function migrateDualFile(stored: unknown): unknown {
  if (typeof stored !== 'object' || stored === null || !('variablesFileId' in stored || 'componentsFileId' in stored)) return stored
  const old = stored as Record<string, unknown>
  const str = (k: string) => (typeof old[k] === 'string' ? old[k] : '')
  return {
    ...(typeof old.enabled === 'boolean' ? { enabled: old.enabled } : {}),
    file1Id: str('variablesFileId'), file1Key: str('variablesApiKey'), file1Role: 'Variables',
    file2Id: str('componentsFileId'), file2Key: str('componentsApiKey'), file2Role: 'Components',
  }
}

/** Stored settings over the defaults, section by section; a section that no longer parses falls back to its defaults. */
export function mergeIntegrations(stored: unknown): IntegrationSettings {
  const source = typeof stored === 'object' && stored !== null ? stored as Record<string, unknown> : {}
  const out = { ...DEFAULT_INTEGRATIONS }
  for (const id of INTEGRATION_IDS) {
    const stored = id === 'dualFile' ? migrateDualFile(source[id]) : source[id]
    const parsed = z.safeParse(sectionSchemas[id], { ...DEFAULT_INTEGRATIONS[id], ...(stored as object | undefined) })
    if (parsed.success) (out as Record<IntegrationId, unknown>)[id] = parsed.data
  }
  return out
}
