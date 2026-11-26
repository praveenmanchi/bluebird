// What kind of GitHub or Jira a pasted address points at, worked out from the
// text alone (no request). Plain string work, not `new URL`: the same code runs
// in the Figma sandbox, which has no URL global.

export type GithubFlavor = 'github.com' | 'ghe.com' | 'server'
export type JiraFlavor = 'cloud' | 'datacenter'

export interface GithubHost {
  flavor: GithubFlavor
  /** What Settings shows in the Connection card's badge. */
  label: string
  /** Web root, e.g. https://github.acme.com. */
  web: string
  /** REST root without trailing slash. */
  api: string
}

const trimSlash = (s: string): string => s.trim().replace(/\/+$/, '')

/** Lowercase host of a URL or bare address ("github.acme.com/org/repo" → "github.acme.com"). */
export function hostOf(value: string): string {
  const [authority = ''] = value.trim().replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').split(/[/?#]/)
  return (authority.split('@').pop() ?? '').toLowerCase()
}

const isGithubCom = (host: string): boolean => host === 'github.com' || host === 'www.github.com' || host === 'api.github.com'

/**
 * Settings › GitHub "Where's your GitHub?" as stored: '' for github.com, else https://<host>[:port] with
 * no path. A repository link ("github.acme.com/acme/tokens") keeps only its host; a bare host gets https://.
 */
export function normalizeGithubAddress(value: string): string {
  const host = hostOf(value)
  if (!host || isGithubCom(host)) return ''
  const scheme = /^http:\/\//i.test(value.trim()) ? 'http' : 'https'
  return `${scheme}://${host}`
}

/** owner/repo from a pasted repository link, or null when the text isn't one. */
export function repoFromLink(value: string): string | null {
  const path = value.trim().replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').split(/[?#]/)[0]!.split('/').slice(1)
  const [owner, repo] = path
  if (!owner || !repo) return null
  const name = repo.replace(/\.git$/i, '')
  return /^[\w.-]+$/.test(owner) && /^[\w.-]+$/.test(name) && !/^\.+$/.test(owner) && !/^\.+$/.test(name) ? `${owner}/${name}` : null
}

/** The GitHub a stored base URL means. Data-residency tenants answer on api.<tenant>.ghe.com, not /api/v3. */
export function githubHost(baseUrl: string): GithubHost {
  const base = trimSlash(baseUrl)
  const host = hostOf(base)
  if (!host || isGithubCom(host)) return { flavor: 'github.com', label: 'GitHub.com', web: 'https://github.com', api: 'https://api.github.com' }
  if (host.endsWith('.ghe.com')) return { flavor: 'ghe.com', label: 'GitHub Enterprise Cloud', web: `https://${host}`, api: `https://api.${host}` }
  return { flavor: 'server', label: 'GitHub Enterprise Server', web: base, api: `${base}/api/v3` }
}

/** Jira Cloud lives on *.atlassian.net; anything else is Server / Data Center. */
export const isAtlassianCloud = (value: string): boolean => hostOf(value).endsWith('.atlassian.net')

/** "Where's your Jira?" as stored: https://<host> with no path; '' stays ''. */
export function normalizeJiraAddress(value: string): string {
  const host = hostOf(value)
  if (!host) return ''
  const scheme = /^http:\/\//i.test(value.trim()) ? 'http' : 'https'
  return `${scheme}://${host}`
}

export interface JiraHost { flavor: JiraFlavor; label: string; site: string }

/** The Jira the two stored fields describe (Cloud in siteUrl, Server / DC in baseUrl), or null when neither is set. */
export function jiraHost(siteUrl: string, baseUrl: string): JiraHost | null {
  const site = trimSlash(baseUrl) || trimSlash(siteUrl)
  if (!site) return null
  return isAtlassianCloud(site) ? { flavor: 'cloud', label: 'Jira Cloud', site } : { flavor: 'datacenter', label: 'Jira Data Center', site }
}

/** Where a person creates the token the Token option asks for. */
export function tokenHelpUrl(service: 'github' | 'jira', web: string, jiraFlavor?: JiraFlavor): string {
  if (service === 'github') return `${trimSlash(web)}/settings/tokens`
  return jiraFlavor === 'datacenter' ? `${trimSlash(web)}/secure/ViewProfile.jspa` : 'https://id.atlassian.com/manage-profile/security/api-tokens'
}
