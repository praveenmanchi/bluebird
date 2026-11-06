// Cross-layer navigation requests. Tabs can't import the shell, so they ask
// for a screen with a DOM event and the shell (App.tsx) listens for it.

export const OPEN_SETTINGS_EVENT = 'bb:open-settings'

/** Ask the shell to show Settings (e.g. a tab's "Connect Jira" action). */
export function requestSettings(): void {
  window.dispatchEvent(new CustomEvent(OPEN_SETTINGS_EVENT))
}

export const OPEN_TAB_EVENT = 'bb:open-tab'

/** Ask the shell to switch tab (e.g. Audit's "Fix these in Variable mapper"). Ignored if this persona or brand doesn't show that tab. */
export function requestTab(tabId: string): void {
  window.dispatchEvent(new CustomEvent<string>(OPEN_TAB_EVENT, { detail: tabId }))
}
