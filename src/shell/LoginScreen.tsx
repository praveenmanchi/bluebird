import { useState } from 'preact/hooks'
import { AccessCodeField, BrandLogo, Button, LoginFooter, MetaBadge, Notice, Spinner, type ContactRowProps } from '@shared/ui'
import { LoginHeading } from './LoginHeading'
import { LoginSso, type LoginSsoPhase, type SsoHandler } from './LoginSso'
import './LoginScreen.css'

/** Access-code card phases — Figma "Login Page" / "· Typing" / "· Submitting" / "· Error" / "· Success". */
export type CodePhase = { kind: 'idle' } | { kind: 'checking' } | { kind: 'error'; message: string } | { kind: 'accepted' }
export type LoginView = 'access-code' | 'sso'

export interface LoginScreenProps {
  /** Heading › Title. */
  title?: string
  /**
   * Check the code. Call `accepted()` as soon as the code is known good (the card switches to
   * "Code accepted · Opening Design studio…" while the app loads); throw to show the message.
   */
  onSubmit: (code: string, accepted: () => void) => Promise<void>
  /** SSO sign-in. See LoginSso. */
  onSso: SsoHandler
  contact?: Omit<ContactRowProps, 'class'>
  /** Start state (stories). */
  initial?: { view?: LoginView; code?: string; phase?: CodePhase; sso?: LoginSsoPhase }
}

/**
 * Figma "Login Page" (40000308:21144): HCLTech header with the private-plugin badge, a centred
 * login card (access code, or SSO via the footer switch) and the legal footer.
 */
export function LoginScreen({ title = 'Design Studio', onSubmit, onSso, contact, initial }: LoginScreenProps) {
  const [view, setView] = useState<LoginView>(initial?.view ?? 'access-code')
  return (
    <div class="bb-login">
      <header class="bb-login__header">
        <BrandLogo logo="hcltech" title="HCLTech" class="bb-login__logo" />
        <MetaBadge tone="accent" meta="HCLTech only">Private plugin</MetaBadge>
      </header>
      <main class="bb-login__body">
        <section class="bb-login__card" aria-labelledby="bb-login-title">
          {view === 'access-code'
            ? <AccessCodeCard title={title} onSubmit={onSubmit} onUseSso={() => setView('sso')} contact={contact} initialCode={initial?.code} initialPhase={initial?.phase} />
            : <LoginSso onSso={onSso} onUseAccessCode={() => setView('access-code')} contact={contact} initialPhase={initial?.sso} />}
        </section>
      </main>
      <footer class="bb-login__footer">
        <p class="bb-login__legal">Design Studio · Internal tool for HCLTech design teams</p>
        <p class="bb-login__legal">Never share your access code outside your team</p>
      </footer>
    </div>
  )
}

interface AccessCodeCardProps {
  title: string
  onSubmit: LoginScreenProps['onSubmit']
  onUseSso: () => void
  contact?: Omit<ContactRowProps, 'class'>
  initialCode?: string
  initialPhase?: CodePhase
}

function AccessCodeCard({ title, onSubmit, onUseSso, contact, initialCode = '', initialPhase = { kind: 'idle' } }: AccessCodeCardProps) {
  const [code, setCode] = useState(initialCode)
  const [phase, setPhase] = useState<CodePhase>(initialPhase)
  const busy = phase.kind === 'checking' || phase.kind === 'accepted'

  async function submit(e: Event) {
    e.preventDefault()
    if (busy || !code.trim()) return
    setPhase({ kind: 'checking' })
    try {
      await onSubmit(code, () => setPhase({ kind: 'accepted' }))
    } catch (error: unknown) {
      setPhase({ kind: 'error', message: error instanceof Error ? error.message : 'Sign-in failed.' })
    }
  }
  function edit(next: string) {
    setCode(next)
    if (phase.kind === 'error') setPhase({ kind: 'idle' })
  }

  return (
    <>
      <LoginHeading icon="access" title={title} titleId="bb-login-title" />
      <Notice bare />
      <form class="bb-login__form" onSubmit={submit} aria-busy={busy}>
        <AccessCodeField
          value={code}
          onValueChange={edit}
          disabled={phase.kind === 'checking'}
          readOnly={phase.kind === 'accepted'}
          status={phase.kind === 'error' ? 'error' : phase.kind === 'accepted' ? 'success' : undefined}
          helperText={phase.kind === 'error' ? phase.message : undefined}
          autoFocus
        />
        <Button type="submit" variant="primary" size="lg" class="bb-login__wide" disabled={!busy && !code.trim()} aria-disabled={busy || undefined}>
          {phase.kind === 'checking' ? <Busy>Checking code…</Busy>
            : phase.kind === 'accepted' ? <Busy>Opening Design Studio…</Busy>
            : phase.kind === 'error' ? 'Try again' : 'Sign in'}
        </Button>
      </form>
      <LoginFooter view="access-code" onSwitch={onUseSso} switchDisabled={busy} contact={contact} />
    </>
  )
}

/** Primary button content while busy: Spinner (On accent) + label, the Submitting / Success frames. */
function Busy({ children }: { children: string }) {
  return <span class="bb-login__busy"><Spinner tone="on-accent" />{children}</span>
}
