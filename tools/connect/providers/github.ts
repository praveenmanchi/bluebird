// Sign in with GitHub on github.com, through Bluebird's GitHub App (roadmap Phase 2; the app's
// settings are in docs/research/auth-server-roadmap.md §5 A3).
//
// A GitHub App's user token acts as the person, but only on repositories where the app is
// installed. So after signing in, an organisation's admin installs the app once (installUrl).
// With "Expire user authorization tokens" on, tokens last 8 hours and come with a 6-month refresh
// token; refreshing is Phase 5, until then the plugin asks to sign in again.
//
// The client secret only ever goes to github.com: exchange() refuses any host acceptsHost() doesn't.
import { expiryFrom, isRecord, refreshFrom, request, tokenAnswer, USER_AGENT, type ProviderFetch } from './http'
import { ProviderError, type Provider, type TokenSet } from './types'

export type { ProviderFetch } from './http'

export interface GithubAppConfig {
  clientId: string
  clientSecret: string
  /** github.com/apps/<slug>; '' when unknown (no install link). */
  slug: string
}

const AUTHORIZE = 'https://github.com/login/oauth/authorize'
const TOKEN = 'https://github.com/login/oauth/access_token'
const USER = 'https://api.github.com/user'

const CLIENT_ID = /^[A-Za-z0-9._-]{1,100}$/
const SLUG = /^[a-z0-9-]{1,100}$/

/** The app from environment variables, or null when it isn't configured. Throws on values that look wrong. */
export function githubConfigFromEnv(env: Readonly<Record<string, string | undefined>>): GithubAppConfig | null {
  const clientId = env.GITHUB_APP_CLIENT_ID?.trim() ?? ''
  const clientSecret = env.GITHUB_APP_CLIENT_SECRET?.trim() ?? ''
  const slug = env.GITHUB_APP_SLUG?.trim() ?? ''
  if (!clientId || !clientSecret) return null
  if (!CLIENT_ID.test(clientId)) throw new Error('GITHUB_APP_CLIENT_ID has characters a GitHub client ID never has.')
  if (slug && !SLUG.test(slug)) throw new Error('GITHUB_APP_SLUG must be the app’s URL name, e.g. bluebird-design.')
  return { clientId, clientSecret, slug }
}

export function githubProvider(app: GithubAppConfig, options: { fetch?: ProviderFetch; now?: () => number } = {}): Provider {
  const get = options.fetch ?? (fetch as unknown as ProviderFetch)
  const now = options.now ?? Date.now
  const acceptsHost = (host: string): boolean => host === 'github.com'

  async function swap(code: string, redirectUri: string, codeVerifier: string): Promise<ReturnType<typeof tokenAnswer>> {
    const body = new URLSearchParams({ client_id: app.clientId, client_secret: app.clientSecret, code, redirect_uri: redirectUri, code_verifier: codeVerifier })
    const { status, body: json } = await request(get, TOKEN, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded', 'user-agent': USER_AGENT },
      body: body.toString(),
    })
    // GitHub answers 200 with { error } for a bad or expired code; tokenAnswer handles both shapes.
    return tokenAnswer(status, json)
  }

  async function login(accessToken: string): Promise<string> {
    const { status, body } = await request(get, USER, {
      method: 'GET',
      headers: { authorization: `Bearer ${accessToken}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', 'user-agent': USER_AGENT },
    })
    if (status !== 200) throw new ProviderError(`user_${status}`)
    if (!isRecord(body) || typeof body.login !== 'string' || !body.login) throw new ProviderError('bad_user')
    return body.login
  }

  return {
    id: 'github',
    acceptsHost,
    ...(app.slug ? { installUrl: `https://github.com/apps/${app.slug}/installations/new` } : {}),
    authorizeUrl: ({ state, redirectUri, codeChallenge }) => {
      const params = new URLSearchParams({
        client_id: app.clientId, redirect_uri: redirectUri, state, code_challenge: codeChallenge, code_challenge_method: 'S256',
        // Bluebird is for people who already use GitHub at work.
        allow_signup: 'false',
      })
      return `${AUTHORIZE}?${params.toString()}`
    },
    exchange: async ({ host, code, redirectUri, codeVerifier }): Promise<TokenSet> => {
      if (!acceptsHost(host)) throw new ProviderError('host')
      const tokens = await swap(code, redirectUri, codeVerifier)
      return {
        accessToken: tokens.access_token,
        ...refreshFrom(tokens),
        account: `@${await login(tokens.access_token)}`,
        expiresAt: expiryFrom(tokens, now()),
      }
    },
  }
}
