/**
 * Hand the viewer a file. The plugin UI is an ordinary iframe, so a Blob URL
 * and a synthetic click is the whole mechanism — no Figma API involved.
 *
 * Returns false where the browser has no Blob URL support (jsdom in tests),
 * so callers can assert the attempt without a DOM stub.
 */
export function downloadText(filename: string, text: string, mime: string): boolean {
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return false
  const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  return true
}

/** A filename that survives every OS: no separators, no trailing dots. */
export function safeFilename(parts: readonly string[], extension: string): string {
  const stem = parts
    .map((p) => p.replace(/[\\/:*?"<>|]+/g, '-').trim())
    .filter(Boolean)
    .join(' — ')
    .replace(/^[-\s—]+|[-.\s—]+$/g, '')
  return `${stem || 'accessibility-report'}.${extension}`
}
