import type { Ref } from 'preact'
import { useRef, useState } from 'preact/hooks'
import { Button, ButtonGroup, PersonaCard, SegmentedControl, TeamBanner, Toggle, type IconName } from '@shared/ui'
import type { BrandTokensResult } from '@shared/brand'
import { config, type ResolvedPersona } from '@shared/config'
import type { Session } from '@shared/session'
import { SettingsIntegrations } from './SettingsIntegrations'
import type { IntegrationsApi } from './integrations/client'
import './SettingsScreen.css'

export interface SettingsScreenProps {
  session: Session | null
  brand: BrandTokensResult | null
  onLogout: () => Promise<void>
  onReset: () => Promise<void>
  /** Configured personas; the switch shows only when there are two or more. */
  personas?: readonly ResolvedPersona[]
  personaId?: string | null
  onPersonaChange?: (id: string) => void
  /** Settings › Integrations store; omit to leave the integration sections out (e.g. before login). */
  integrations?: IntegrationsApi
  /** Re-open the first-run product tour; omit to hide the row. */
  onReplayTour?: () => void
}

interface PersonaRowProps {
  personas: readonly ResolvedPersona[]
  personaId: string | null
  onPersonaChange: (id: string) => void
  switchRef?: Ref<HTMLDivElement>
}

/** Code-only row (not in the Figma Settings page): which persona's tab set the tab row shows. */
function PersonaRow({ personas, personaId, onPersonaChange, switchRef }: PersonaRowProps) {
  const active = personas.find((p) => p.id === personaId) ?? personas[0]!
  const byLabel = new Map(personas.map((p) => [p.label, p.id]))
  return (
    <div class="bb-settings__persona" ref={switchRef}>
      <Toggle
        showSwitch={false}
        title="Persona"
        description={`Sets which tabs you see. ${active.label} shows ${active.tabs.map((t) => t.label).join(', ')}.`}
      />
      <SegmentedControl
        aria-label="Persona"
        options={personas.map((p) => p.label)}
        value={active.label}
        onChange={(label) => { const id = byLabel.get(label); if (id) onPersonaChange(id) }}
      />
    </div>
  )
}

/**
 * Figma "Settings page" (40000100:13084): a session summary row above a
 * right-aligned button group "Logoff session" / "Reset all Settings". The
 * row is the Toggle instance with its switch hidden (Toggle=false); its
 * placeholder copy becomes the session details.
 */
export function SettingsScreen({ session, brand, onLogout, onReset, personas = [], personaId = null, onPersonaChange, integrations, onReplayTour }: SettingsScreenProps) {
  const switchRef = useRef<HTMLDivElement>(null)
  const active = personas.find((p) => p.id === personaId) ?? personas[0]
  const canSwitch = personas.length > 1 && onPersonaChange !== undefined
  const [busy, setBusy] = useState<'logout' | 'reset' | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const label = session ? (config.brand.brands[session.brandId]?.label ?? session.brandId) : 'No session'
  const since = session ? new Date(session.since).toLocaleDateString() : ''
  const source = brand?.source === 'figma' ? 'tokens resolved from this Figma document' : 'generated tokens (no Brand collection in this document)'
  const run = async (which: 'logout' | 'reset', fn: () => Promise<void>) => { setBusy(which); try { await fn() } finally { setBusy(null) } }

  return (
    <section class="bb-settings" aria-label="Settings">
      {integrations && active && canSwitch && (
        <PersonaCard
          class="bb-settings__persona-card"
          name={active.label}
          tabs={active.tabs.map((t) => ({ label: t.label, icon: t.icon as IconName }))}
          footnote={`You’re set up as ${active.label}. Change the persona to switch the tabs above.`}
          onOpen={() => switchRef.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus()}
        />
      )}
      <Toggle
        class="bb-settings__row"
        showSwitch={false}
        title={`Signed in as ${label}`}
        description={`Brand unlocked with an access code${since ? ` on ${since}` : ''} · ${source}. You stay signed in until you log off; resetting also forgets window size and preferences.`}
      />
      {canSwitch && onPersonaChange && (
        <PersonaRow personas={personas} personaId={personaId} onPersonaChange={onPersonaChange} switchRef={switchRef} />
      )}
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
      {onReplayTour && (
        <div class="bb-settings__tour">
          <Toggle showSwitch={false} title="Product tour" description="Walk through what each of your tabs does, with a short demo of each." />
          <Button variant="secondary" onClick={onReplayTour}>Replay tour</Button>
        </div>
      )}
      {integrations && <SettingsIntegrations api={integrations} />}
      <TeamBanner class="bb-settings__team" taglineSize="auto" />
    </section>
  )
}
