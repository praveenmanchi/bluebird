import { useState } from 'preact/hooks'
import { Button, ButtonGroup, PersonaCard, TeamBanner, Toggle, type IconName } from '@shared/ui'
import type { BrandTokensResult } from '@shared/brand'
import { config, type ResolvedPersona } from '@shared/config'
import type { Session } from '@shared/session'
import { PersonaBird } from './persona/PersonaBird'
import { managedFor } from '@shared/integrations/effective'
import { SettingsIntegrations } from './SettingsIntegrations'
import type { IntegrationsApi } from './integrations/client'
import './SettingsScreen.css'

export interface SettingsScreenProps {
  session: Session | null
  brand: BrandTokensResult | null
  onLogout: () => Promise<void>
  onReset: () => Promise<void>
  /** Configured personas; the persona card shows only when there are two or more. */
  personas?: readonly ResolvedPersona[]
  personaId?: string | null
  /** Opens the persona screen. */
  onChangePersona?: () => void
  /** Settings › Integrations store; omit to leave the integration sections out (e.g. before login). */
  integrations?: IntegrationsApi
  /** Re-open the first-run product tour; omit to hide the row. */
  onReplayTour?: () => void
}

/**
 * Figma "Settings page" (40000100:13084): a session summary row above a
 * right-aligned button group "Logoff session" / "Reset all Settings". The
 * row is the Toggle instance with its switch hidden (Toggle=false); its
 * placeholder copy becomes the session details.
 */
export function SettingsScreen({ session, brand, onLogout, onReset, personas = [], personaId = null, onChangePersona, integrations, onReplayTour }: SettingsScreenProps) {
  const active = personas.find((p) => p.id === personaId) ?? personas[0]
  const canSwitch = personas.length > 1 && onChangePersona !== undefined
  const [busy, setBusy] = useState<'logout' | 'reset' | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const label = session ? (config.brand.brands[session.brandId]?.label ?? session.brandId) : 'No session'
  const since = session ? new Date(session.since).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
  const source = tokenSource(brand)
  const run = async (which: 'logout' | 'reset', fn: () => Promise<void>) => { setBusy(which); try { await fn() } finally { setBusy(null) } }

  return (
    <section class="bb-settings" aria-label="Settings">
      {active && canSwitch && (
        <PersonaCard
          class="bb-settings__persona-card"
          name={active.label}
          media={<PersonaBird personaId={active.id} label={active.label} />}
          tabs={active.tabs.map((t) => ({ label: t.label, icon: t.icon as IconName }))}
          footnote={`You’re set up as ${active.label}. Change the persona to switch the tabs above.`}
          onOpen={onChangePersona}
        />
      )}
      <Toggle
        class="bb-settings__row"
        showSwitch={false}
        title={`Signed in as ${label}`}
        description={`Brand unlocked with an access code${since ? ` on ${since}` : ''} · ${source}. You stay signed in until you sign out; resetting also forgets window size and preferences.`}
      />
      {confirmReset ? (
        <ButtonGroup
          class="bb-settings__actions"
          secondaryLabel="Keep settings"
          primaryLabel="Yes, reset everything"
          primaryVariant="danger"
          onSecondary={() => setConfirmReset(false)}
          onPrimary={() => { void run('reset', onReset) }}
          primaryLoading={busy === 'reset'}
          secondaryDisabled={busy !== null}
        />
      ) : (
        <ButtonGroup
          class="bb-settings__actions"
          secondaryLabel="Sign out"
          primaryLabel="Reset all settings"
          primaryVariant="danger"
          onSecondary={() => { void run('logout', onLogout) }}
          onPrimary={() => setConfirmReset(true)}
          secondaryLoading={busy === 'logout'}
          primaryDisabled={busy !== null}
        />
      )}
      {onReplayTour && (
        <div class="bb-settings__tour">
          <Toggle showSwitch={false} title="Product tour" description="Walk through what each of your tabs does, with a short demo of each." />
          <Button variant="secondary" onClick={onReplayTour}>Replay tour</Button>
        </div>
      )}
      {integrations && <SettingsIntegrations api={integrations} managed={managedFor(session?.brandId)} managedBy={label} brandId={session?.brandId} />}
      <TeamBanner class="bb-settings__team" taglineSize="auto" />
    </section>
  )
}

/** Where the brand tokens came from. A fault (library unreadable, mode missing) is named here
 *  rather than in the banner; a file without the Brand collection is the normal case. */
function tokenSource(brand: BrandTokensResult | null): string {
  if (brand?.source === 'figma') return 'tokens resolved from this Figma document'
  if (brand?.note && !brand.expected) return `generated tokens: ${brand.note.replace(/\s*Using (fallback|generated) tokens[^.]*\.$/, '').replace(/\.$/, '')}`
  return 'generated tokens (no Brand collection in this document)'
}
