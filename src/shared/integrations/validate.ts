// Field rules for Settings › Integrations. Empty optional fields pass; the
// rules only reject a value that cannot work. The sandbox runs them again
// before storing, so the screen and the store agree on what is valid.
import { CODE_HOSTS, CONNECT_METHODS, FILE_ROLES, MAX_LIBRARY_FILES, MCP_FRAMEWORKS, MCP_PULL_REQUESTS, MODEL_OPTIONS, PROVIDER_OPTIONS, REFRESH_OPTIONS, type IntegrationId, type IntegrationValues } from './schema'

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
const githubToken: Rule = (v) => /^[\x21-\x7E]+$/.test(v) ? null : 'The token has spaces or characters a GitHub or Bitbucket token never has. Paste it again'
const host: Rule = (v) => (CODE_HOSTS as readonly string[]).includes(v) ? null : 'Pick GitHub or Bitbucket'
const fileId: Rule = (v) => FILE_ID.test(v) ? null : 'Paste the file URL or its ID from figma.com/design/<file-id>/…'
const noSpaces: Rule = (v) => /\s/.test(v) ? 'Branch names can’t contain spaces' : null
const jiraKey: Rule = (v) => JIRA_KEY.test(v) ? null : 'Use the uppercase project key, e.g. DS'
// The Jira API token travels to these two, so they are pinned harder than a plain https URL:
// Cloud sites live on atlassian.net; the gateway is https (or the local proxy, npm run jira:proxy).
const jiraSite: Rule = (v) => {
  const host = URL_PARTS.exec(v)?.[3]?.toLowerCase() ?? ''
  return isSafeUrl(v) && v.toLowerCase().startsWith('https://') && /^[a-z0-9-]+\.atlassian\.net$/.test(host) ? null : 'Use your Atlassian Cloud site, e.g. https://yourteam.atlassian.net'
}
// The company's Bluebird gateway (or, in development, the local proxy): the token travels through it.
const gateway: Rule = (v) => isSafeUrl(v) ? null : 'Use the gateway address IT gave you, e.g. https://bluebird-gateway.yourcompany.com'
// Atlassian site ids are UUIDs; anything else could reach another api.atlassian.com path.
const cloudId: Rule = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v) ? null : 'Sign in again: the Jira site id isn’t valid'
const oneOf = (options: readonly string[]): Rule => (v) => options.includes(v) ? null : `Pick one of: ${options.join(', ')}`
// A repository folder: relative, no '..' segments, no leading slash — it ends up in a GitHub API path.
const folder: Rule = (v) => /^(?!\/)(?!.*(^|\/)\.\.(\/|$))[\w.\-/]+$/.test(v) && !v.endsWith('/') ? null : 'Use a folder inside the repository, e.g. .bluebird/history'
// An npm package name, optionally scoped: it is quoted in the hand-off prompt as an import source.
const npmPackage: Rule = (v) => /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/.test(v) ? null : 'Use the package name as it is imported, e.g. @acme/ui'
const storyTemplate: Rule = (v) => v.includes('{slug}') || v.includes('{name}') ? null : 'Include {slug} or {name} so each component gets its own story'

const RULES: { [K in IntegrationId]: Partial<Record<keyof IntegrationValues<K>, Rule>> } = {
  github: { repo, baseUrl: url, gatewayUrl: gateway, method: oneOf(CONNECT_METHODS), host, email },
  notifications: { designSystemWebhook: url, devTeamWebhook: url, outlookWebhook: url, emails },
  storybook: { baseUrl: url, indexUrl: url, storyPathTemplate: storyTemplate },
  zeroheight: { publicBaseUrl: url },
  dualFile: { token },
  ai: { provider: oneOf(PROVIDER_OPTIONS), claudeModel: oneOf(MODEL_OPTIONS.claude), openaiModel: oneOf(MODEL_OPTIONS.openai), geminiModel: oneOf(MODEL_OPTIONS.gemini) },
  mcp: {
    componentRepo: repo, componentToken: githubToken, componentBranch: noSpaces, componentFramework: oneOf(MCP_FRAMEWORKS), componentFolder: folder,
    screenRepo: repo, screenToken: githubToken, screenBranch: noSpaces, screenFramework: oneOf(MCP_FRAMEWORKS), screenFolder: folder, screenPackage: npmPackage,
    libraryRepo: repo, libraryToken: githubToken, libraryBranch: noSpaces, libraryPullRequests: oneOf(MCP_PULL_REQUESTS),
    enterpriseUrl: url,
    componentHost: host, componentEmail: email, screenHost: host, screenEmail: email, libraryHost: host, libraryEmail: email,
  },
  jira: { projectKey: jiraKey, email, siteUrl: jiraSite, baseUrl: url, proxyUrl: gateway, method: oneOf(CONNECT_METHODS), cloudId },
  storage: { repo, apiKey: token, branch: noSpaces, baseUrl: url, folder, refresh: oneOf(REFRESH_OPTIONS), host, email },
}

/** Longest name a library file can have: it is a label in Settings and UX AI's sources. */
export const MAX_FILE_NAME = 60

/**
 * Dual File rows, keyed files.<i>.<field>. One token opens every file, so a file needs the token
 * and the token needs a file. A lone empty first row is "not set up yet"; a row added and left
 * without a URL is an error, as is the same file listed twice.
 */
function dualFileErrors(v: IntegrationValues<'dualFile'>): FieldErrors {
  const errors: FieldErrors = {}
  const has = (s: string) => s.trim() !== ''
  const files = v.files ?? []
  const listed = files.filter((f) => has(f.id))
  if (files.length > MAX_LIBRARY_FILES) errors.files = `Up to ${MAX_LIBRARY_FILES} files. Remove one first`
  if (listed.length && !has(v.token)) errors.token = 'Add your Figma personal access token to read these files'
  if (has(v.token) && !listed.length) errors['files.0.id'] = 'Add a library file URL, or clear the token'
  const seen = new Set<string>()
  files.forEach((f, i) => {
    const at = (field: string) => `files.${i}.${field}`
    const name = f.name.trim() || `File ${i + 1}`
    if (f.name.trim().length > MAX_FILE_NAME) errors[at('name')] = `Keep the name to ${MAX_FILE_NAME} characters`
    if (has(f.id) && !FILE_ID.test(f.id.trim())) errors[at('id')] = fileId(f.id)!
    if (!has(f.id) && files.length > 1) errors[at('id')] = `Add ${name}’s URL, or remove it`
    if (has(f.role) && !(FILE_ROLES as readonly string[]).includes(f.role)) errors[at('role')] = oneOf(FILE_ROLES)(f.role)!
    if (has(f.id) && seen.has(f.id.trim())) errors[at('id')] = 'This file is already listed. Set the first one to “Variables + Components” instead'
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
