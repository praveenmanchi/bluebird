// Shell side of the coach-mark intros: the stored progress (sandbox intro:* handlers) and the
// decision of what to show next. Saves are optimistic: the screen moves on even when a save fails,
// and the worst case is an intro showing once more on the next open.
import { signal } from '@preact/signals'
import type { RpcClient } from '@shared/bridge'
import { config } from '@shared/config'
import { INTRO_DEFAULT, INTRO_MSG, type IntroState } from '@shared/session'

export const introState = signal<IntroState | null>(null)

/** What the intro layer shows right now. */
export type IntroMode =
  | { kind: 'layout' }
  | { kind: 'whatsnew'; tabs: readonly string[] }
  | { kind: 'newtab'; tabs: readonly string[] }
  | { kind: 'tab'; tabId: string; replay: boolean }

export async function loadIntro(client: RpcClient): Promise<IntroState> {
  try {
    introState.value = await client.call<IntroState>(INTRO_MSG.status)
  } catch {
    // Unreadable progress: treat every intro as done rather than nag on each open.
    introState.value = { layoutDone: true, seenTabs: [], knownTabs: null, announced: [] }
  }
  return introState.value
}

export function saveIntro(client: RpcClient, patch: Partial<IntroState>): void {
  const next = { ...(introState.value ?? INTRO_DEFAULT), ...patch }
  introState.value = next
  void client.call(INTRO_MSG.save, patch).catch(() => undefined)
}

const add = (list: readonly string[], ids: readonly string[]): string[] => [...new Set([...list, ...ids])]

/** Visible tabs this person hasn't opened since they appeared: they carry a New badge. */
export function newTabsOf(state: IntroState | null, visible: readonly string[]): string[] {
  if (!state?.knownTabs) return []
  const known = new Set(state.knownTabs)
  return visible.filter((id) => !known.has(id))
}

/**
 * What to show when nothing is open, in the Figma flow-map order: the layout intro once, then the
 * What's new pop-up for tabs added since the last open, then the open tab's intro the first time.
 */
export function nextIntro(state: IntroState, visible: readonly string[], activeTab: string | null): IntroMode | null {
  if (!state.layoutDone) return { kind: 'layout' }
  const announced = new Set(state.announced)
  const fresh = newTabsOf(state, visible).filter((id) => !announced.has(id))
  if (fresh.length) return { kind: 'whatsnew', tabs: fresh }
  if (activeTab && visible.includes(activeTab) && !state.seenTabs.includes(activeTab)) return { kind: 'tab', tabId: activeTab, replay: false }
  return null
}

/**
 * Every tab this build ships (plugin.config.json tabs.<id>.enabled), whatever the persona. Switching
 * persona is not an update, so a tab only counts as new when a later build adds or switches it on.
 */
export function releasedTabs(tabs: Readonly<Record<string, { enabled: boolean }>> = config.tabs): string[] {
  return Object.entries(tabs).filter(([, t]) => t.enabled).map(([id]) => id)
}

/** The first open records every released tab as known, so a fresh install never sees "new" tabs. */
export function firstRunPatch(state: IntroState, released: readonly string[]): Partial<IntroState> | null {
  return state.knownTabs === null ? { knownTabs: [...released] } : null
}

export const markLayoutDone = (): Partial<IntroState> => ({ layoutDone: true })
export const markTabSeen = (state: IntroState, tabId: string): Partial<IntroState> => ({ seenTabs: add(state.seenTabs, [tabId]) })
export const markAnnounced = (state: IntroState, tabs: readonly string[]): Partial<IntroState> => ({ announced: add(state.announced, tabs) })
/** Opening a tab clears its New badge. */
export function markOpened(state: IntroState, tabId: string): Partial<IntroState> | null {
  if (!state.knownTabs || state.knownTabs.includes(tabId)) return null
  return { knownTabs: add(state.knownTabs, [tabId]) }
}
