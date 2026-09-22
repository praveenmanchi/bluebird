// Access-code session shared by the sandbox handlers, the shell and the mock.
export interface Session {
  brandId: string
  /** ISO date of the login. */
  since: string
}

export interface SessionLoginRequest { code: string }

export const SESSION_MSG = {
  status: 'session:status',
  login: 'session:login',
  logout: 'session:logout',
  reset: 'session:reset',
} as const
