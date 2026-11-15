import { signal, computed } from '@preact/signals'
import { config, personas, resolvePersonas, type ResolvedPersona } from '@shared/config'
import type { BrandTokensResult } from '@shared/brand'
import type { TransportStatus } from '@shared/bridge'
import type { WindowSize } from '@shared/config'
import type { Session } from '@shared/session'

// Shell-level state only: which persona and tab are active, brand status,
// connection status. Tab-local state lives inside each feature folder.

const defaultPersona = personas.find((p) => p.id === config.activePersona) ?? personas[0] ?? null

export const activePersonaId = signal<string | null>(defaultPersona?.id ?? null)
export const activeTabId = signal<string | null>(defaultPersona?.tabs[0]?.id ?? null)
export const brandStatus = signal<BrandTokensResult | null>(null)

/** Access-code session. `boot` until session:status answers; first run after sign-in goes `splash` → `persona` → `onboarding` (the tour) → `team-setup` → `figma-key` → `app`. */
export type Screen = 'boot' | 'login' | 'splash' | 'persona' | 'onboarding' | 'team-setup' | 'figma-key' | 'app' | 'settings'
export const screen = signal<Screen>('boot')
export const session = signal<Session | null>(null)
/** True while the persona screen was opened from Settings, so it can go back there and skips the intro. */
export const changingPersona = signal(false)
/** True while the tour runs from Settings › Replay tour: it then returns to the app, not to the team setup screen. */
export const replayingTour = signal(false)
export const connection = signal<TransportStatus>('connected')
/** Current plugin window size; the footer's S / M / L, expand and grip all go through shell:resize. */
export const windowSize = signal<WindowSize>({ width: config.window.width, height: config.window.height })
/** True while the plugin is shrunk to its Mini Launcher; windowSize keeps the size to restore. */
export const minimized = signal(false)

/** Personas as the signed-in brand sees them: its tab list (plugin.config.json) hides and orders tabs. */
export const brandPersonas = computed<readonly ResolvedPersona[]>(() => session.value ? resolvePersonas(config, session.value.brandId) : personas)
export const activePersona = computed(() => brandPersonas.value.find((p) => p.id === activePersonaId.value) ?? brandPersonas.value[0] ?? null)
export const visibleTabs = computed(() => activePersona.value?.tabs ?? [])

export function selectPersona(id: string): void {
  const persona = brandPersonas.value.find((p) => p.id === id)
  if (!persona) return
  activePersonaId.value = id
  activeTabId.value = persona.tabs[0]?.id ?? null
}

/** After the brand changes: keep the persona and tab when this brand still shows them, else fall back to its first. */
export function syncTabs(): void {
  const persona = activePersona.value
  activePersonaId.value = persona?.id ?? null
  if (!persona?.tabs.some((t) => t.id === activeTabId.value)) activeTabId.value = persona?.tabs[0]?.id ?? null
}

export function selectTab(id: string): void {
  if (visibleTabs.value.some((t) => t.id === id)) activeTabId.value = id
}
