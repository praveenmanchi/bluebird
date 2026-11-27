// What every sign-in provider (GitHub, Atlassian, Bitbucket, the fake) gives the broker.

export type Service = 'github' | 'jira' | 'bitbucket'
export const SERVICES: readonly Service[] = ['github', 'jira', 'bitbucket']

export interface TokenSet {
  accessToken: string
  /** Kept on the server for refresh (Phase 5); never sent to the plugin. */
  refreshToken?: string
  /** "@maria-r" or "Maria Rossi". */
  account: string
  /** ISO date, or '' when the token doesn't expire. */
  expiresAt: string
  /** Jira Cloud sign-in: the site the token is for. API calls go to api.atlassian.com/ex/jira/{cloudId}. */
  site?: { cloudId: string; url: string }
}

export interface AuthorizeInput {
  host: string
  state: string
  redirectUri: string
  codeChallenge: string
}

export interface ExchangeInput {
  host: string
  code: string
  redirectUri: string
  codeVerifier: string
}

export interface Provider {
  id: Service
  /** Whether this broker has an app for the GitHub / Jira / Bitbucket the person pasted. */
  acceptsHost(host: string): boolean
  authorizeUrl(input: AuthorizeInput): string
  exchange(input: ExchangeInput): Promise<TokenSet>
  /** Where an admin installs the app on their organisation (GitHub Apps); absent when there's no such step. */
  installUrl?: string
  /** Only the fake provider serves its own consent page. */
  consentPage?: (url: URL) => Response
}

const SAFE_CODE = /^[a-z0-9_]{1,40}$/

/**
 * A provider said no, or couldn't be reached. `code` is safe to log: one of our own words, or the
 * provider's error code when it's a plain snake_case word (never its free text, which can echo
 * codes or tokens).
 */
export class ProviderError extends Error {
  readonly code: string
  constructor(code: string) {
    const safe = SAFE_CODE.test(code) ? code : 'unknown'
    super(`provider error: ${safe}`)
    this.name = 'ProviderError'
    this.code = safe
  }
}
