/**
 * Hand the viewer a text file. The plugin UI is an ordinary iframe, so a Blob URL and a
 * synthetic click is the whole mechanism. Returns false where Blob URLs don't exist (jsdom).
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
