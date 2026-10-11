// Browser-side clipboard helper for the handoff actions. It can be blocked inside
// the plugin iframe, so it reports success instead of throwing.

/** Puts `text` on the clipboard; false when the Clipboard API is missing or denied. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
