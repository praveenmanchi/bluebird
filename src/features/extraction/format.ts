// Display helpers for the Extraction screens.
import type { ExtractionStamp } from './messages'

export const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`

/** "8 Nov, 14:20" (the viewer's time zone). */
export function shortDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
}

/** "Praveen Manchi · 8 Nov, 14:20", or "No extraction yet". */
export function stampLabel(stamp: ExtractionStamp | null): string {
  return stamp ? `${stamp.by} · ${shortDateTime(stamp.at)}` : 'No extraction yet'
}

