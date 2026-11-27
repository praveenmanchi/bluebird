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
  /** Only the fake provider serves its own consent page. */
  consentPage?: (url: URL) => Response
}
