// Sign in with Atlassian for Jira Cloud: OAuth 2.0 (3LO) through Bluebird's app in the Atlassian
// developer console (roadmap Phase 3; app settings in docs/research/auth-server-roadmap.md §5 A4).
//
// The token is for api.atlassian.com, not the site: Jira calls go to
// api.atlassian.com/ex/jira/{cloudId}/rest/api/3/…, so exchange() returns the cloudId of the site the
// person pasted, and refuses when the person didn't grant that site. Tokens last about an hour;
// refresh tokens rotate (each use returns a new one), handled in Phase 5.
//
// PKCE isn't documented for Atlassian 3LO, so no code_challenge is sent. The confirm code, the
// browser cookie and the signed state (app.ts, browser.ts) still guard the flow.
import { envValue, firstText, expiryFrom, isRecord, refreshFrom, request, tokenAnswer, type ProviderFetch } from './http'
import { ProviderError, type Provider, type TokenSet } from './types'

export interface AtlassianAppConfig { clientId: string; clientSecret: string }

const AUTHORIZE = 'https://auth.atlassian.com/authorize'
const TOKEN = 'https://auth.atlassian.com/oauth/token'
const SITES = 'https://api.atlassian.com/oauth/token/accessible-resources'
const ME = 'https://api.atlassian.com/me'
/** Read and write Jira work, read users (assignees) and the person’s own name. */
// No offline_access: the broker drops refresh tokens until Phase 5 keeps them, and an unused
// long-lived grant is only risk. Add it back with refresh handles.
export const ATLASSIAN_SCOPES = 'read:jira-work write:jira-work read:jira-user read:me'
const SITE_HOST = /^[a-z0-9][a-z0-9-]{0,62}\.atlassian\.net$/

export function atlassianConfigFromEnv(env: Readonly<Record<string, string | undefined>>): AtlassianAppConfig | null {
  const clientId = envValue(env, 'ATLASSIAN_CLIENT_ID', /^[A-Za-z0-9._-]{1,200}$/)
  const clientSecret = envValue(env, 'ATLASSIAN_CLIENT_SECRET')
  return clientId && clientSecret ? { clientId, clientSecret } : null
}

export function atlassianProvider(app: AtlassianAppConfig, options: { fetch?: ProviderFetch; now?: () => number } = {}): Provider {
  const get = options.fetch ?? (fetch as unknown as ProviderFetch)
  const now = options.now ?? Date.now
  const acceptsHost = (host: string): boolean => SITE_HOST.test(host)
  const bearer = (token: string) => ({ authorization: `Bearer ${token}`, accept: 'application/json' })

  async function siteFor(token: string, host: string): Promise<{ cloudId: string; url: string }> {
    const { status, body } = await request(get, SITES, { method: 'GET', headers: bearer(token) })
    if (status !== 200 || !Array.isArray(body)) throw new ProviderError(`sites_${status}`)
    const want = `https://${host}`
    const match = body.find((s: unknown) => isRecord(s) && typeof s.url === 'string' && s.url.replace(/\/+$/, '').toLowerCase() === want)
    if (!isRecord(match) || typeof match.id !== 'string' || !match.id) throw new ProviderError('site_not_granted')
    return { cloudId: match.id, url: want }
  }

  async function nameOf(token: string): Promise<string> {
    const { status, body } = await request(get, ME, { method: 'GET', headers: bearer(token) })
    if (status !== 200) throw new ProviderError(`user_${status}`)
    const name = firstText(body, ['name', 'nickname', 'account_id'])
    if (!name) throw new ProviderError('bad_user')
    return name
  }

  return {
    id: 'jira',
    acceptsHost,
    authorizeUrl: ({ state, redirectUri }) => {
      const params = new URLSearchParams({
        audience: 'api.atlassian.com', client_id: app.clientId, scope: ATLASSIAN_SCOPES, redirect_uri: redirectUri, state, response_type: 'code', prompt: 'consent',
      })
      return `${AUTHORIZE}?${params.toString()}`
    },
    exchange: async ({ host, code, redirectUri }): Promise<TokenSet> => {
      if (!acceptsHost(host)) throw new ProviderError('host')
      const { status, body } = await request(get, TOKEN, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ grant_type: 'authorization_code', client_id: app.clientId, client_secret: app.clientSecret, code, redirect_uri: redirectUri }),
      })
      const tokens = tokenAnswer(status, body)
      const site = await siteFor(tokens.access_token, host)
      return { accessToken: tokens.access_token, ...refreshFrom(tokens), account: await nameOf(tokens.access_token), expiresAt: expiryFrom(tokens, now()), site }
    },
  }
}
