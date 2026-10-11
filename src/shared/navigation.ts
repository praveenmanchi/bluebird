// Cross-layer navigation requests. Tabs can't import the shell, so they ask
// for a screen with a DOM event and the shell (App.tsx) listens for it.

export const OPEN_SETTINGS_EVENT = 'bb:open-settings'

/** Ask the shell to show Settings (e.g. a tab's "Connect Jira" action). */
export function requestSettings(): void {
  window.dispatchEvent(new CustomEvent(OPEN_SETTINGS_EVENT))
}
