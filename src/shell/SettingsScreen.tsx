import { useState } from 'preact/hooks'
import { ButtonGroup, Toggle } from '@shared/ui'
import type { BrandTokensResult } from '@shared/brand'
import { config } from '@shared/config'
import type { Session } from '@shared/session'
import './SettingsScreen.css'

export interface SettingsScreenProps {
  session: Session | null
  brand: BrandTokensResult | null
  onLogout: () => Promise<void>
  onReset: () => Promise<void>
}

/**
 * Figma "Settings page" (40000100:13084): a session summary row above a
 * right-aligned button group "Logoff session" / "Reset all Settings". The
 * row is the Toggle instance with its switch hidden (Toggle=false); its
 * placeholder copy becomes the session details.
 */
export function SettingsScreen({ session, brand, onLogout, onReset }: SettingsScreenProps) {
  const [busy, setBusy] = useState<'logout' | 'reset' | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const label = session ? (config.brand.brands[session.brandId]?.label ?? session.brandId) : 'No session'
  const since = session ? new Date(session.since).toLocaleDateString() : ''
  const source = brand?.source === 'figma' ? 'tokens resolved from this Figma document' : 'generated tokens (no Brand collection in this document)'
  const run = async (which: 'logout' | 'reset', fn: () => Promise<void>) => { setBusy(which); try { await fn() } finally { setBusy(null) } }

  return (
    <section class="bb-settings" aria-label="Settings">
      <Toggle
        class="bb-settings__row"
        showSwitch={false}
        title={`Signed in as ${label}`}
        description={`Brand unlocked with an access code${since ? ` on ${since}` : ''} · ${source}. You stay signed in until you log off; resetting also forgets window size and preferences.`}
      />
      {confirmReset ? (
        <ButtonGroup
          class="bb-settings__actions"
          secondaryLabel="Keep settings"
          primaryLabel="Yes, reset everything"
          onSecondary={() => setConfirmReset(false)}
          onPrimary={() => { void run('reset', onReset) }}
          primaryLoading={busy === 'reset'}
          secondaryDisabled={busy !== null}
        />
      ) : (
        <ButtonGroup
          class="bb-settings__actions"
          secondaryLabel="Logoff session"
          primaryLabel="Reset all Settings"
          onSecondary={() => { void run('logout', onLogout) }}
          onPrimary={() => setConfirmReset(true)}
          secondaryLoading={busy === 'logout'}
          primaryDisabled={busy !== null}
        />
      )}
    </section>
  )
}
