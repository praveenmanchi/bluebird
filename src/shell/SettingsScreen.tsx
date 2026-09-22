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
  /** Settings → "Keep me signed in" (the design's Toggle row). */
  onKeepSignedIn: (keep: boolean) => Promise<void>
}

/**
 * Figma "Settings page" (40000100:13084): a session summary, the "Keep me
 * signed in" Toggle row, and a right-aligned button group "Logoff session" /
 * "Reset all Settings".
 */
export function SettingsScreen({ session, brand, onLogout, onReset, onKeepSignedIn }: SettingsScreenProps) {
  const [busy, setBusy] = useState<'logout' | 'reset' | 'keep' | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const label = session ? (config.brand.brands[session.brandId]?.label ?? session.brandId) : 'No session'
  const since = session ? new Date(session.since).toLocaleDateString() : ''
  const source = brand?.source === 'figma' ? 'tokens resolved from this Figma document' : 'generated tokens (no Brand collection in this document)'
  const run = async (which: 'logout' | 'reset' | 'keep', fn: () => Promise<void>) => { setBusy(which); try { await fn() } finally { setBusy(null) } }

  return (
    <section class="bb-settings" aria-label="Settings">
      <div class="bb-settings__row">
        <p class="bb-settings__title">Signed in as {label}</p>
        <p class="bb-settings__description">Brand unlocked with an access code{since ? ` on ${since}` : ''} · {source}.</p>
      </div>
      <Toggle
        class="bb-settings__row"
        title="Keep me signed in"
        description="Stay unlocked the next time the plugin opens. Turn off to ask for the access code on every open; the current session stays until you log off or close the plugin."
        checked={session?.keepSignedIn ?? true}
        disabled={session === null || busy !== null}
        onChange={(keep) => { void run('keep', () => onKeepSignedIn(keep)) }}
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
