// Sign in with Bitbucket Cloud through Bluebird's OAuth consumer (roadmap Phase 4; consumer
// settings in docs/research/auth-server-roadmap.md §5 A7).
//
// Bitbucket's own rules, unlike GitHub's and Atlassian's:
// - scopes are set on the consumer, not asked for in the URL;
// - the callback is the consumer's callback URL, so no redirect_uri is sent;
// - the client id and secret go in Basic auth on the token call;
// - access tokens last 2 hours, so refresh (Phase 5) matters more here than anywhere.
// PKCE isn't documented for Bitbucket Cloud, so no code_challenge is sent.
import { envValue, expiryFrom, firstText, refreshFrom, request, tokenAnswer, type ProviderFetch } from './http'
import { ProviderError, type Provider, type TokenSet } from './types'

export interface BitbucketAppConfig { clientId: string; clientSecret: string }

const AUTHORIZE = 'https://bitbucket.org/site/oauth2/authorize'
const TOKEN = 'https://bitbucket.org/site/oauth2/access_token'
const USER = 'https://api.bitbucket.org/2.0/user'

export function bitbucketConfigFromEnv(env: Readonly<Record<string, string | undefined>>): BitbucketAppConfig | null {
  const clientId = envValue(env, 'BITBUCKET_CLIENT_ID', /^[A-Za-z0-9]{1,100}$/)
  const clientSecret = envValue(env, 'BITBUCKET_CLIENT_SECRET')
  return clientId && clientSecret ? { clientId, clientSecret } : null
}

export function bitbucketProvider(app: BitbucketAppConfig, options: { fetch?: ProviderFetch; now?: () => number } = {}): Provider {
  const get = options.fetch ?? (fetch as unknown as ProviderFetch)
  const now = options.now ?? Date.now
  const acceptsHost = (host: string): boolean => host === 'bitbucket.org'

  async function nameOf(token: string): Promise<string> {
    const { status, body } = await request(get, USER, { method: 'GET', headers: { authorization: `Bearer ${token}`, accept: 'application/json' } })
    if (status !== 200) throw new ProviderError(`user_${status}`)
    const name = firstText(body, ['display_name', 'nickname'])
    if (!name) throw new ProviderError('bad_user')
    return name
  }

  return {
    id: 'bitbucket',
    acceptsHost,
    authorizeUrl: ({ state }) => `${AUTHORIZE}?${new URLSearchParams({ client_id: app.clientId, response_type: 'code', state }).toString()}`,
    exchange: async ({ host, code }): Promise<TokenSet> => {
      if (!acceptsHost(host)) throw new ProviderError('host')
      const { status, body } = await request(get, TOKEN, {
        method: 'POST',
        headers: { authorization: `Basic ${btoa(`${app.clientId}:${app.clientSecret}`)}`, 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
        body: new URLSearchParams({ grant_type: 'authorization_code', code }).toString(),
      })
      const tokens = tokenAnswer(status, body)
      return { accessToken: tokens.access_token, ...refreshFrom(tokens), account: await nameOf(tokens.access_token), expiresAt: expiryFrom(tokens, now()) }
    },
  }
}
