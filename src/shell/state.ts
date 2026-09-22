import { signal, computed } from '@preact/signals'
import { config, personas } from '@shared/config'
import type { BrandTokensResult } from '@shared/brand'
import type { TransportStatus } from '@shared/bridge'
import type { WindowSize } from '@shared/config'

// Shell-level state only: which persona and tab are active, brand status,
// connection status. Tab-local state lives inside each feature folder.

const defaultPersona = personas.find((p) => p.id === config.activePersona) ?? personas[0] ?? null

export const activePersonaId = signal<string | null>(defaultPersona?.id ?? null)
export const activeTabId = signal<string | null>(defaultPersona?.tabs[0]?.id ?? null)
export const brandStatus = signal<BrandTokensResult | null>(null)
export const connection = signal<TransportStatus>('connected')
/** Current plugin window size; the footer's S / M / L, expand and grip all go through shell:resize. */
export const windowSize = signal<WindowSize>({ width: config.window.width, height: config.window.height })

export const activePersona = computed(() => personas.find((p) => p.id === activePersonaId.value) ?? null)
export const visibleTabs = computed(() => activePersona.value?.tabs ?? [])

export function selectPersona(id: string): void {
  const persona = personas.find((p) => p.id === id)
  if (!persona) return
  activePersonaId.value = id
  activeTabId.value = persona.tabs[0]?.id ?? null
}

export function selectTab(id: string): void {
  if (visibleTabs.value.some((t) => t.id === id)) activeTabId.value = id
}
