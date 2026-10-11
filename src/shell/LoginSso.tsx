import { useEffect, useRef, useState } from 'preact/hooks'
import { Button, LoginFooter, Notice, SSO_PROVIDER_LABEL, Spinner, SsoProviderButton, type ContactRowProps, type SsoProvider } from '@shared/ui'
import { LoginHeading } from './LoginHeading'
import './LoginSso.css'

/** Thrown by an SSO handler when the identity provider signed the user in but the org has not approved them. */
export class SsoNotApprovedError extends Error {
  constructor(message = 'Your account isn’t approved yet') {
    super(message)
    this.name = 'SsoNotApprovedError'
  }
}

/** Resolves once the user is signed in; rejects with SsoNotApprovedError (or any Error) otherwise. Abort = Cancel. */
export type SsoHandler = (provider: SsoProvider, signal: AbortSignal) => Promise<void>

export type LoginSsoPhase =
  | { kind: 'choose' }
  | { kind: 'waiting'; provider: SsoProvider }
  | { kind: 'not-approved' }
  | { kind: 'failed'; message: string }

export interface LoginSsoProps {
  onSso: SsoHandler
  /** Footer switch: back to the access-code card. */
  onUseAccessCode: () => void
  contact?: Omit<ContactRowProps, 'class'>
  /** Start in a given phase (stories). */
  initialPhase?: LoginSsoPhase
}

const PROVIDERS: readonly SsoProvider[] = ['microsoft', 'okta', 'google']

/** Figma "Login · SSO" (40000328:5494) card body, plus its "SSO redirecting" and "SSO not approved" states. */
export function LoginSso({ onSso, onUseAccessCode, contact, initialPhase = { kind: 'choose' } }: LoginSsoProps) {
  const [phase, setPhase] = useState<LoginSsoPhase>(initialPhase)
  const pending = useRef<AbortController | null>(null)
  useEffect(() => () => pending.current?.abort(), [])

  async function start(provider: SsoProvider) {
    pending.current?.abort()
    const controller = new AbortController()
    pending.current = controller
    setPhase({ kind: 'waiting', provider })
    try {
      await onSso(provider, controller.signal)
    } catch (error: unknown) {
      if (controller.signal.aborted) return
      setPhase(error instanceof SsoNotApprovedError
        ? { kind: 'not-approved' }
        : { kind: 'failed', message: error instanceof Error ? error.message : 'Sign-in didn’t finish.' })
    } finally {
      if (pending.current === controller) pending.current = null
    }
  }
  function cancel() {
    pending.current?.abort()
    pending.current = null
    setPhase({ kind: 'choose' })
  }

  return (
    <>
      <LoginHeading
        icon="url"
        titleId="bb-login-title"
        title="Sign in with SSO"
        subtitle="Use your HCLTech work account. Your organisation’s design-system admin must have approved you for Design studio."
      />
      {phase.kind === 'not-approved' && <Notice tone="error" />}
      {phase.kind === 'failed' && <Notice tone="error" title="Couldn’t sign in with SSO">{phase.message}</Notice>}
      {phase.kind === 'waiting'
        ? (
          <div class="bb-login-sso__waiting" role="status">
            <Spinner tone="accent" size="lg" />
            <p class="bb-login-sso__status">Waiting for {SSO_PROVIDER_LABEL[phase.provider]}…</p>
            <p class="bb-login__hint">Finish signing in in the browser window that just opened. This screen updates on its own.</p>
            <Button variant="secondary" size="lg" class="bb-login__wide" onClick={cancel}>Cancel</Button>
          </div>
        )
        : (
          <div class="bb-login-sso__providers">
            {PROVIDERS.map((p) => <SsoProviderButton key={p} provider={p} onClick={() => void start(p)} />)}
            <p class="bb-login__hint">A browser window opens to finish signing in. Come back here when you’re done.</p>
          </div>
        )}
      <LoginFooter view="sso" onSwitch={() => { cancel(); onUseAccessCode() }} contact={contact} />
    </>
  )
}
