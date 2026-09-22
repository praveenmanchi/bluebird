import { useState } from 'preact/hooks'
import { Button, Input, BrandLogo } from '@shared/ui'
import './LoginScreen.css'

export interface LoginScreenProps {
  /** Figma "Design studio". */
  title?: string
  /** Figma "Subtitle" (placeholder copy in the design; the real line comes from config.name). */
  subtitle?: string
  /** Resolves when the code was accepted; throw to show the message under the field. */
  onSubmit: (code: string) => Promise<void>
}

/** Figma "Login Page" (40000100:13204): HCLTech mark, heading, access-code input with eye toggle, primary Submit. */
export function LoginScreen({ title = 'Design studio', subtitle = 'Enter the access code you received from your design-system team.', onSubmit }: LoginScreenProps) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: Event) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try { await onSubmit(code) } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Login failed') } finally { setBusy(false) }
  }

  return (
    <div class="bb-login">
      <BrandLogo logo="hcltech" title="HCLTech" class="bb-login__mark" />
      <form class="bb-login__form" onSubmit={submit} aria-busy={busy}>
        <div class="bb-login__heading">
          <h1 class="bb-login__title">{title}</h1>
          <p class="bb-login__subtitle">{subtitle}</p>
        </div>
        <div class="bb-login__row">
          <Input
            class="bb-login__field"
            aria-label="Access code"
            placeholder="Access code"
            password
            value={code}
            onValueChange={(v) => { setCode(v); if (error) setError(null) }}
            error={error !== null}
            helperText={error ?? undefined}
            autoComplete="off"
            autoFocus
            disabled={busy}
          />
          <Button type="submit" loading={busy}>Submit</Button>
        </div>
      </form>
    </div>
  )
}
