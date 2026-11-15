import { useEffect, useRef, useState } from 'preact/hooks'
import { BrandLogo, Button, Input, MetaBadge, Notice } from '@shared/ui'
import type { BrandId } from '@shared/brand'
import type { RpcClient } from '@shared/bridge'
import type { IntegrationId, IntegrationSettings, IntegrationValues } from '@shared/integrations'
import { FIGMA_KEY_MSG, type FigmaKeyCheckResult } from '@shared/session'
import tokensShot from './onboarding/figma-tokens.png'
import './OnboardingScreen.css'
import './TeamSetupScreen.css'
import './FigmaKeyScreen.css'

export interface FigmaKeyScreenProps {
  client: RpcClient
  brand?: BrandId
  load: () => Promise<IntegrationSettings>
  save: (section: IntegrationId, values: IntegrationValues) => Promise<IntegrationValues>
  /** Skipped, connected, or a key was already saved. */
  onFinish: () => void
}

type KeyState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'connected'; handle: string }
  | { kind: 'error'; message: string }

/** Figma "After the tour · Figma API key" (40002976:36098), copy as the designer wrote it. */
export const FIGMA_KEY_STEPS = [
  'Log in to your Figma account via the web or desktop app.',
  'Click your account menu or profile icon in the top-left corner of the file browser and select Settings.',
  'Go to the Security tab.',
  'Find the Personal access tokens section and click Generate new token.',
  'Name your token, choose your expiration date and permission scopes, and click Generate token.',
  'Copy the token immediately—Figma will only display it this once.',
] as const

/** The product name the warning uses: the Bridge brand's wordmark reads "The Bridge". */
const productName = (brand?: BrandId): string => (brand === 'bridge' || !brand ? 'The Bridge' : 'Design Studio')

const errorText = (e: unknown): string => (e instanceof Error && e.message ? e.message : 'Figma didn’t accept it. Check it hasn’t expired and has the File content scope, then paste it again.')

/**
 * Its own screen after team setup: asks for a Figma personal access token, checks it with
 * GET /v1/me, then saves it into Settings › Dual File. Skipped when a token is already saved.
 */
export function FigmaKeyScreen({ client, brand, load, save, onFinish }: FigmaKeyScreenProps) {
  const root = useRef<HTMLElement>(null)
  const [settings, setSettings] = useState<IntegrationSettings | null>(null)
  const [token, setToken] = useState('')
  const [state, setState] = useState<KeyState>({ kind: 'idle' })
  useEffect(() => { root.current?.focus() }, [])
  useEffect(() => {
    let live = true
    load().then((s) => {
      if (!live) return
      if (s.dualFile.token.trim()) onFinish()
      else setSettings(s)
    }, () => { if (live) setSettings(null) })
    return () => { live = false }
  }, [load, onFinish])

  const authenticate = async () => {
    setState({ kind: 'checking' })
    try {
      const { handle } = await client.call<FigmaKeyCheckResult>(FIGMA_KEY_MSG.check, { token: token.trim() })
      const current = settings ?? await load()
      await save('dualFile', { ...current.dualFile, token: token.trim() })
      setState({ kind: 'connected', handle })
    } catch (e: unknown) {
      setState({ kind: 'error', message: errorText(e) })
    }
  }

  const connected = state.kind === 'connected'
  const checking = state.kind === 'checking'
  const primary = connected ? 'Continue' : checking ? 'Authenticating…' : state.kind === 'error' ? 'Try again' : 'Authenticate'

  return (
    <section ref={root} class="bb-onboarding bb-team-setup-screen bb-figma-key" aria-label="Figma API key" tabIndex={-1}>
      <header class="bb-onboarding__header">
        <BrandLogo brand={brand} class="bb-onboarding__logo" />
      </header>
      <div class="bb-onboarding__body">
        <div class="bb-onboarding__copy" aria-live="polite">
          <div class="bb-figma-key__counter">
            <span class="bb-onboarding__counter">Figma key</span>
            <MetaBadge tone={connected ? 'success' : 'warning'}>{connected ? 'Added' : 'Recommended'}</MetaBadge>
          </div>
          <h2 class="bb-onboarding__title">Add your Figma API key</h2>
          <p class="bb-onboarding__text">A personal access token lets the plugin read variables, file versions and library analytics through Figma’s API. It stays on this computer.</p>
        </div>
        <div class="bb-figma-key__content">
          {state.kind !== 'connected' && state.kind !== 'error' && (
            <div class="bb-figma-key__warning" role="note">
              <svg class="bb-figma-key__warning-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.8 15 14H1L8 1.8Z" class="bb-figma-key__warning-outline" /><rect x="7.35" y="6" width="1.3" height="4.2" rx="0.65" /><circle cx="8" cy="11.9" r="0.8" /></svg>
              <div class="bb-figma-key__warning-copy">
                <strong class="bb-figma-key__warning-title">Many features need this key</strong>
                <span class="bb-figma-key__warning-body">Without a Figma API key you can’t use many of the features {productName(brand)} offers: variable search across files, file versions in History, library analytics in Audit and extraction from the API.</span>
              </div>
            </div>
          )}
          <div class="bb-figma-key__how">
            <h3 class="bb-figma-key__heading">To get your Figma API key (known as a Personal Access Token), follow these steps in your Figma Account Settings:</h3>
            <ol class="bb-figma-key__steps">
              {FIGMA_KEY_STEPS.map((s, i) => (
                <li key={i} class="bb-figma-key__step"><span class="bb-figma-key__marker" aria-hidden="true">{i + 1}</span><span>{s}</span></li>
              ))}
            </ol>
          </div>
          <img class="bb-figma-key__shot" src={tokensShot} alt="Figma › Settings › Security: the Personal access tokens list with Generate new token." />
          <Input
            label="Personal access token"
            password
            value={token}
            placeholder="Paste your token (starts with figd_)"
            helperText="Saved only in this plugin on this computer. You can change or remove it in Settings › Dual File."
            error={state.kind === 'error'}
            disabled={checking || connected}
            onValueChange={(v) => { setToken(v); if (state.kind === 'error') setState({ kind: 'idle' }) }}
            autoComplete="off"
            spellcheck={false}
          />
          {checking && <MetaBadge tone="neutral">Checking the key with Figma…</MetaBadge>}
          {connected && <MetaBadge tone="success">{state.handle ? `Connected as ${state.handle}` : 'Connected'} · reads variables, versions and library analytics</MetaBadge>}
          {state.kind === 'error' && <Notice tone="error" title="That key didn’t work">{state.message}</Notice>}
        </div>
      </div>
      <footer class="bb-onboarding__footer">
        <div class="bb-onboarding__nav">
          {!connected && <Button variant="secondary" disabled={checking} onClick={onFinish}>Skip for now</Button>}
          <Button
            class="bb-onboarding__next"
            loading={checking}
            disabled={!connected && !token.trim()}
            onClick={() => { if (connected) onFinish(); else void authenticate() }}
          >
            {primary}
          </Button>
        </div>
      </footer>
    </section>
  )
}
