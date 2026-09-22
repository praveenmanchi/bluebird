// Access-code session shared by the sandbox handlers, the shell and the mock.
export interface Session {
  brandId: string
  /** ISO date of the login. */
  since: string
  /** Settings → "Keep me signed in". Off = the session lasts for the current plugin run only. */
  keepSignedIn: boolean
  /** Set when keepSignedIn is off: the sandbox run that owns the session. A new run sees it as logged out. */
  runToken?: string
}

export interface SessionLoginRequest { code: string; keepSignedIn?: boolean }
export interface SessionUpdateRequest { keepSignedIn: boolean }

export const SESSION_MSG = {
  status: 'session:status',
  login: 'session:login',
  logout: 'session:logout',
  reset: 'session:reset',
  update: 'session:update',
} as const
