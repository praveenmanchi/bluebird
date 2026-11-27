// A stand-in provider for development, tests and staging: it serves its own
// consent page on the broker (/fake/authorize) and hands out fake tokens. It
// lets the whole sign-in flow run before any real GitHub, Atlassian or
// Bitbucket app exists. Never configure it in production.
import { page } from '../pages'
import type { Provider, Service } from './types'

const HOST = /^[a-z0-9.-]{0,253}(:\d{1,5})?$/i
const TOKEN_LIFETIME_MS = 8 * 60 * 60_000
/** The site id the fake Jira sign-in hands out (a real one is a UUID too). */
export const FAKE_CLOUD_ID = '00000000-0000-4000-8000-00000000f4ce'

export function fakeProvider(publicUrl: string, id: Service, now: () => number = Date.now): Provider {
  const base = publicUrl.replace(/\/+$/, '')
  return {
    id,
    acceptsHost: (host) => HOST.test(host),
    authorizeUrl: ({ state, redirectUri, codeChallenge }) =>
      `${base}/fake/authorize?state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(redirectUri)}&code_challenge=${encodeURIComponent(codeChallenge)}`,
    exchange: async ({ code, host }) => ({
      accessToken: `fake-${id}-${code.slice(0, 12)}`,
      refreshToken: `fake-refresh-${code.slice(0, 12)}`,
      account: '@fake-user',
      expiresAt: new Date(now() + TOKEN_LIFETIME_MS).toISOString(),
      // Like real Atlassian sign-in, a Jira sign-in says which site the token is for.
      ...(id === 'jira' ? { site: { cloudId: FAKE_CLOUD_ID, url: `https://${host}` } } : {}),
    }),
    consentPage: (url) => {
      const state = url.searchParams.get('state') ?? ''
      const redirect = url.searchParams.get('redirect_uri') ?? ''
      // Only ever send the browser back to this broker's own callback.
      if (!redirect.startsWith(`${base}/auth/`)) return page(400, 'Something’s off', 'This sign-in link is broken. Start again from Figma.')
      const decision = url.searchParams.get('decision')
      if (decision === 'approve') return Response.redirect(`${redirect}?code=${crypto.randomUUID().replace(/-/g, '')}&state=${encodeURIComponent(state)}`, 302)
      if (decision === 'deny') return Response.redirect(`${redirect}?error=access_denied&state=${encodeURIComponent(state)}`, 302)
      const here = (d: string) => `${base}/fake/authorize?${new URLSearchParams({ state, redirect_uri: redirect, decision: d }).toString()}`
      return page(200, 'Fake sign-in', `This is the test provider. Approving gives Bluebird a fake ${id} token.`, [
        { label: 'Approve', href: here('approve'), primary: true },
        { label: 'Deny', href: here('deny') },
      ])
    },
  }
}
