// Access-code session shared by the sandbox handlers, the shell and the mock.
export interface Session {
  brandId: string
  /** ISO date of the login. The session persists until "Logoff session" or "Reset all Settings". */
  since: string
}

export interface SessionLoginRequest { code: string }

/** clientStorage key of the signed-in Session. */
export const SESSION_KEY = 'bluebird:session'

export const SESSION_MSG = {
  status: 'session:status',
  login: 'session:login',
  logout: 'session:logout',
  reset: 'session:reset',
} as const

/** First-run product tour. Stored per user next to the session, so Reset brings the tour back. */
export interface OnboardingStatus {
  /** ISO date the tour was finished or skipped; null until then. */
  completedAt: string | null
  /** True when the user left with Skip instead of reaching the last step. */
  skipped: boolean
}

export interface OnboardingCompleteRequest { skipped: boolean }

export const ONBOARDING_MSG = {
  status: 'onboarding:status',
  complete: 'onboarding:complete',
} as const
