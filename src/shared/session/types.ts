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

/** The persona picked on the first-run screen. Stored per user, so it survives reopens and Reset forgets it. */
export interface PersonaStatus { personaId: string | null }

export interface PersonaSelectRequest { personaId: string }

export const PERSONA_MSG = {
  status: 'persona:status',
  select: 'persona:select',
} as const

/**
 * The coach-mark intros (Figma page Onboarding, sections 1.5 / 2.x / 4). One clientStorage entry
 * per user, so Reset brings every intro back.
 */
export interface IntroState {
  /** The plugin-chrome tour (tabs, settings, statuses, sizes, minimize, resize) was finished or skipped. */
  layoutDone: boolean
  /** Tabs whose first-open intro was finished or skipped. */
  seenTabs: readonly string[]
  /**
   * Tabs this person already knows about: every tab they could see on first run, plus each new tab
   * once opened. Null until the first run records it. A visible tab missing here carries a New badge.
   */
  knownTabs: readonly string[] | null
  /** New tabs already shown in the What's new pop-up, so it shows once per tab. */
  announced: readonly string[]
}

export const INTRO_DEFAULT: IntroState = { layoutDone: false, seenTabs: [], knownTabs: null, announced: [] }

export const INTRO_MSG = {
  status: 'intro:status',
  /** Merges a partial IntroState into the stored one and answers the result. */
  save: 'intro:save',
} as const

/** Figma API key screen: checks a personal access token against GET /v1/me. */
export interface FigmaKeyCheckRequest { token: string }
export interface FigmaKeyCheckResult { handle: string }

export const FIGMA_KEY_MSG = {
  check: 'figma-key:check',
} as const
