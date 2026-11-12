// Field rules for Settings › Integrations. Empty optional fields pass; the
// rules only reject a value that cannot work. The sandbox runs them again
// before storing, so the screen and the store agree on what is valid.
import { FILE_ROLES, MODEL_OPTIONS, OUTPUT_FORMATS, PROVIDER_OPTIONS, REFRESH_OPTIONS, type IntegrationId, type IntegrationValues } from './schema'

export type FieldErrors = Partial<Record<string, string>>

// owner/repo; a segment made only of dots (. or ..) would walk the GitHub API path.
const REPO = /^(?!\.+\/)[\w.-]+\/(?!\.+$)[\w.-]+$/
const EMAIL = /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/
const FILE_ID = /^[A-Za-z0-9]+$/
const JIRA_KEY = /^[A-Z][A-Z0-9_]*$/

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])
// scheme://[userinfo@]host[:port][/path|?query|#hash]. A regex, not `new URL`, because the same
// rules run in the Figma sandbox, which has no URL global.
const URL_PARTS = /^([a-z][a-z0-9+.-]*):\/\/(?:([^/?#@\s]*)@)?(\[[^\]\s]+\]|[^/?#:@\s]+)(?::\d{1,5})?(?:[/?#]\S*)?$/i

/** https only (keys and webhook payloads go to these hosts); plain http just for a local dev server. No credentials in the URL. */
function isSafeUrl(value: string): boolean {
  const parts = URL_PARTS.exec(value)
  if (!parts) return false
  const [, scheme, userinfo, host] = parts
  if (userinfo !== undefined) return false
  const protocol = scheme!.toLowerCase()
  return protocol === 'https' || (protocol === 'http' && LOCAL_HOSTS.has(host!.toLowerCase()))
}

type Rule = (value: string) => string | null
const url: Rule = (v) => isSafeUrl(v) ? null : 'Enter a full https:// URL without a username or password'
const repo: Rule = (v) => REPO.test(v) ? null : 'Use the owner/repository format, e.g. gap-inc/design-tokens'
const emails: Rule = (v) => v.split(',').map((e) => e.trim()).filter(Boolean).every((e) => EMAIL.test(e)) ? null : 'Separate addresses with commas, e.g. a@company.com, b@company.com'
const email: Rule = (v) => EMAIL.test(v) ? null : 'Enter one email address, e.g. user@company.com'
// Personal access tokens are printable ASCII; a pasted newline or smart quote can't go in a request header.
const token: Rule = (v) => /^[\x21-\x7E]+$/.test(v) ? null : 'The key has spaces or characters a Figma token never has. Paste it again'
const fileId: Rule = (v) => FILE_ID.test(v) ? null : 'Paste the file URL or its ID from figma.com/design/<file-id>/…'
const noSpaces: Rule = (v) => /\s/.test(v) ? 'Branch names can’t contain spaces' : null
const jiraKey: Rule = (v) => JIRA_KEY.test(v) ? null : 'Use the uppercase project key, e.g. DS'
// The Jira API token travels to these two, so they are pinned harder than a plain https URL:
// Cloud sites live on atlassian.net, and the CORS proxy runs on this machine (npm run jira:proxy).
const jiraSite: Rule = (v) => {
  const host = URL_PARTS.exec(v)?.[3]?.toLowerCase() ?? ''
  return isSafeUrl(v) && v.toLowerCase().startsWith('https://') && /^[a-z0-9-]+\.atlassian\.net$/.test(host) ? null : 'Use your Atlassian Cloud site, e.g. https://yourteam.atlassian.net'
}
const localProxy: Rule = (v) => {
  const parts = URL_PARTS.exec(v)
  return isSafeUrl(v) && parts && LOCAL_HOSTS.has(parts[3]!.toLowerCase()) ? null : 'Use the local proxy address, e.g. http://localhost:8787'
}
const outputFormat: Rule = (v) => (OUTPUT_FORMATS as readonly string[]).includes(v) ? null : `Use one of: ${OUTPUT_FORMATS.join(', ')}`
const oneOf = (options: readonly string[]): Rule => (v) => options.includes(v) ? null : `Pick one of: ${options.join(', ')}`
// A repository folder: relative, no '..' segments, no leading slash — it ends up in a GitHub API path.
const folder: Rule = (v) => /^(?!\/)(?!.*(^|\/)\.\.(\/|$))[\w.\-/]+$/.test(v) && !v.endsWith('/') ? null : 'Use a folder inside the repository, e.g. .bluebird/history'
const storyTemplate: Rule = (v) => v.includes('{slug}') || v.includes('{name}') ? null : 'Include {slug} or {name} so each component gets its own story'

const RULES: { [K in IntegrationId]: Partial<Record<keyof IntegrationValues<K>, Rule>> } = {
  github: { repo, baseUrl: url },
  notifications: { designSystemWebhook: url, devTeamWebhook: url, emails },
  storybook: { baseUrl: url, indexUrl: url, storyPathTemplate: storyTemplate },
  zeroheight: { publicBaseUrl: url },
  dualFile: { file1Id: fileId, file2Id: fileId, file1Key: token, file2Key: token, file1Role: oneOf(FILE_ROLES), file2Role: oneOf(FILE_ROLES) },
  ai: { provider: oneOf(PROVIDER_OPTIONS), claudeModel: oneOf(MODEL_OPTIONS.claude), openaiModel: oneOf(MODEL_OPTIONS.openai), geminiModel: oneOf(MODEL_OPTIONS.gemini) },
  mcp: { repo, outputFormat, branchTemplate: noSpaces, enterpriseUrl: url },
  jira: { projectKey: jiraKey, email, siteUrl: jiraSite, baseUrl: url, proxyUrl: localProxy },
  storage: { repo, apiKey: token, branch: noSpaces, baseUrl: url, folder, refresh: oneOf(REFRESH_OPTIONS) },
}

/**
 * Rules across fields. Dual File: a file needs its token (File 2 may borrow File 1's, since a
 * personal access token belongs to the person, not the file), a token needs its file, and one
 * file in both slots is set once as "Variables + Components" instead.
 */
function dualFileErrors(v: IntegrationValues<'dualFile'>): FieldErrors {
  const errors: FieldErrors = {}
  const has = (s: string) => s.trim() !== ''
  if (has(v.file1Id) && !has(v.file1Key)) errors.file1Key = 'Add the API key that can open File 1'
  if (has(v.file1Key) && !has(v.file1Id)) errors.file1Id = 'Add File 1’s ID, or clear its API key'
  if (has(v.file2Id) && !has(v.file2Key) && !has(v.file1Key)) errors.file2Key = 'Add an API key that can open File 2'
  if (has(v.file2Key) && !has(v.file2Id)) errors.file2Id = 'Add File 2’s ID, or clear its API key'
  if (has(v.file1Id) && v.file1Id.trim() === v.file2Id.trim()) errors.file2Id = 'File 2 is File 1. Set File 1 to “Variables + Components” and leave File 2 empty'
  // Files 3…N: same rules per row, keyed extraFiles.<i>.<field>; a row may borrow File 1's key like File 2 does.
  const seen = new Set([v.file1Id.trim(), v.file2Id.trim()].filter(Boolean))
  ;(v.extraFiles ?? []).forEach((f, i) => {
    const n = i + 3
    const at = (field: string) => `extraFiles.${i}.${field}`
    if (has(f.id) && !FILE_ID.test(f.id.trim())) errors[at('id')] = fileId(f.id)!
    if (has(f.id) && !has(f.key) && !has(v.file1Key)) errors[at('key')] = `Add an API key that can open File ${n}`
    if (has(f.key) && !has(f.id)) errors[at('id')] = `Add File ${n}’s ID, or clear its API key`
    if (has(f.key) && !/^[\x21-\x7E]+$/.test(f.key.trim())) errors[at('key')] = token(f.key)!
    if (has(f.role) && !(FILE_ROLES as readonly string[]).includes(f.role)) errors[at('role')] = oneOf(FILE_ROLES)(f.role)!
    if (has(f.id) && seen.has(f.id.trim())) errors[at('id')] = `File ${n} is already listed above. Give one slot both roles instead`
    if (has(f.id)) seen.add(f.id.trim())
  })
  return errors
}

/** Messages keyed by field; an empty object means the section can be saved. */
export function validateIntegration<K extends IntegrationId>(section: K, values: IntegrationValues<K>): FieldErrors {
  const errors: FieldErrors = section === 'dualFile' ? dualFileErrors(values as IntegrationValues<'dualFile'>) : {}
  const rules = RULES[section] as Partial<Record<string, Rule>>
  for (const [field, rule] of Object.entries(rules)) {
    const value = (values as Record<string, unknown>)[field]
    if (typeof value !== 'string' || !value.trim() || !rule) continue
    const message = rule(value.trim())
    if (message) errors[field] = message
  }
  return errors
}
