// Tab-local state. Nothing outside src/features/uxai reads or writes this.
import { signal } from '@preact/signals'
import { VARIABLES, type BoundVariable, type PanelMode, type Source, type Turn } from './fixtures'

export type { Turn, TurnStatus } from './fixtures'
export type View = 'sources' | 'chat'

export const view = signal<View>('sources')
/** The Dual File library files once loaded; empty until then (no sample cards in the tab). */
export const sources = signal<readonly Source[]>([])
export const turns = signal<readonly Turn[]>([])
export const draft = signal('')
export const variables = signal<readonly BoundVariable[]>(VARIABLES)
export const panelMode = signal<PanelMode>('swap')

/** The fake "thinking" timer; cleared by Stop and reset(). */
let timer: ReturnType<typeof setTimeout> | null = null

export function setTimer(next: ReturnType<typeof setTimeout> | null): void {
  if (timer !== null) clearTimeout(timer)
  timer = next
}

export function reset(): void {
  setTimer(null)
  view.value = 'sources'
  sources.value = []
  turns.value = []
  draft.value = ''
  variables.value = VARIABLES
  panelMode.value = 'swap'
}
