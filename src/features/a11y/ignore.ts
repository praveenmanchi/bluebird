// Ignored findings. The scan has to guess from layer names in places, so a wrong
// guess must be correctable once instead of argued with on every scan. Pure: the
// keys and the list rules. The records live in the Figma document (sandbox/ignores.ts).
import type { ContrastIssue, NonTextIssue, TargetSizeIssue } from './messages'

export interface IgnoreRecord {
  /** The finding this covers. Two scans of the same file produce the same key. */
  key: string
  /** When it was ignored, ISO. The card says "Ignored on 12 Nov 2026". */
  at: string
}

/** A colour pair at a size: ignoring it covers every layer that shares it, now and later. */
export const contrastIgnoreKey = (issue: Pick<ContrastIssue, 'foreground' | 'background' | 'fontSize' | 'isBold'>): string =>
  `contrast:${issue.foreground}|${issue.background}|${issue.fontSize}|${issue.isBold}`

export const nonTextIgnoreKey = (issue: Pick<NonTextIssue, 'foreground' | 'background'>): string =>
  `nontext:${issue.foreground}|${issue.background}`

/** Targets are keyed by size *and* layer: one 16px icon being fine says nothing about the next. */
export const targetIgnoreKey = (issue: Pick<TargetSizeIssue, 'width' | 'height' | 'nodeId'>): string =>
  `target:${issue.width}x${issue.height}|${issue.nodeId}`

export const findIgnore = (records: readonly IgnoreRecord[], key: string): IgnoreRecord | undefined =>
  records.find((r) => r.key === key)

export function withIgnore(records: readonly IgnoreRecord[], key: string, at: string): IgnoreRecord[] {
  return [...records.filter((r) => r.key !== key), { key, at }]
}

export function withoutIgnore(records: readonly IgnoreRecord[], key: string): IgnoreRecord[] {
  return records.filter((r) => r.key !== key)
}

/** Records read back from the document, which anyone could have edited. */
export function parseIgnores(raw: string): IgnoreRecord[] {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((r): r is IgnoreRecord =>
      typeof r === 'object' && r !== null
      && typeof (r as IgnoreRecord).key === 'string' && (r as IgnoreRecord).key.length > 0
      && typeof (r as IgnoreRecord).at === 'string')
  } catch {
    return []
  }
}

/** The records a scan came back with, as the tab keeps them: key → when it was ignored. */
export function seedIgnored(scan: {
  issues: readonly ContrastIssue[]
  nonText: readonly NonTextIssue[]
  targets: readonly TargetSizeIssue[]
}): Record<string, string> {
  const out: Record<string, string> = {}
  for (const i of scan.issues) if (i.ignored) out[contrastIgnoreKey(i)] = i.ignored.at
  for (const n of scan.nonText) if (n.ignored) out[nonTextIgnoreKey(n)] = n.ignored.at
  for (const t of scan.targets) if (t.ignored) out[targetIgnoreKey(t)] = t.ignored.at
  return out
}
