// Helpers every rule pack uses. Pure: no Figma, no DOM.
import { contrastRatio, type RGB } from '@shared/figma/color'
import type { FindingSeverity } from '@shared/ui'
import type { AgentFinding, AgentFix, AgentId } from '../messages'

export interface RuleContext {
  /** Rule ids switched on; empty = all. */
  rules: ReadonlySet<string>
  /** Whether the designer asked for fixes to be proposed / applied (Review only lists). */
  mode: 'review' | 'suggest' | 'autofix'
}

export const ruleOn = (ctx: RuleContext, rule: string): boolean => ctx.rules.size === 0 || ctx.rules.has(rule)

let counter = 0
export const findingId = (agent: AgentId, rule: string): string => `${agent}:${rule}:${(counter += 1).toString(36)}`
export const resetFindingIds = (): void => { counter = 0 }

export interface Draft {
  rule: string
  severity: FindingSeverity
  title: string
  meta: string
  nodeId: string
  nodeIds?: readonly string[]
  fix?: AgentFix | null
  fixLabel?: string | null
  fixable?: boolean
}

/** A finding with its id; in Review mode fixes are described, not offered. */
export function finding(agent: AgentId, ctx: RuleContext, d: Draft): AgentFinding {
  const fix = ctx.mode === 'review' ? (d.fix && d.fix.kind !== 'manual' ? { kind: 'manual', note: d.fixLabel ?? 'Fix in Suggest mode' } as AgentFix : d.fix ?? null) : d.fix ?? null
  return {
    id: findingId(agent, d.rule), agent, rule: d.rule, severity: d.severity, title: d.title, meta: d.meta,
    nodeId: d.nodeId, nodeIds: d.nodeIds ?? [d.nodeId], fix, fixLabel: d.fixLabel ?? null,
    fixable: ctx.mode !== 'review' && (d.fixable ?? false) && fix !== null && fix.kind !== 'manual',
  }
}

/** Findings with the same rule and title are one row that points at every layer. */
export function groupFindings(list: readonly AgentFinding[]): AgentFinding[] {
  const out = new Map<string, AgentFinding>()
  for (const f of list) {
    const key = `${f.rule}|${f.title}|${f.fixLabel ?? ''}`
    const prev = out.get(key)
    if (!prev) out.set(key, { ...f, nodeIds: [...f.nodeIds] })
    else out.set(key, { ...prev, nodeIds: [...new Set([...prev.nodeIds, ...f.nodeIds])], meta: prev.meta.includes(' · +') ? prev.meta.replace(/ · \+(\d+) more$/, (_m, n: string) => ` · +${Number(n) + 1} more`) : `${prev.meta} · +1 more` })
  }
  return [...out.values()]
}

const ORDER: Record<FindingSeverity, number> = { critical: 0, serious: 1, moderate: 2, minor: 3 }
export const bySeverity = (a: AgentFinding, b: AgentFinding): number => ORDER[a.severity] - ORDER[b.severity]

/** 0–100 from how much of what was checked passed; a critical counts more than a minor. */
export function score(findings: readonly AgentFinding[], checked: number): number {
  if (checked <= 0) return 100
  const weight: Record<FindingSeverity, number> = { critical: 3, serious: 2, moderate: 1, minor: 0.5 }
  const penalty = findings.reduce((n, f) => n + weight[f.severity] * Math.max(1, f.nodeIds.length), 0)
  return Math.max(0, Math.min(100, Math.round(100 * (1 - penalty / Math.max(checked, penalty)))))
}

// ---- WCAG ------------------------------------------------------------------

export const WCAG = { AA_NORMAL: 4.5, AA_LARGE: 3, AAA_NORMAL: 7, AAA_LARGE: 4.5, NON_TEXT: 3, TARGET: 24, LARGE_PX: 24, LARGE_BOLD_PX: 18.66 } as const

export const isLargeText = (fontSize: number, weight: number): boolean => fontSize >= WCAG.LARGE_PX || (weight >= 700 && fontSize >= WCAG.LARGE_BOLD_PX)

export const neededRatio = (fontSize: number, weight: number, enhanced = false): number =>
  enhanced ? (isLargeText(fontSize, weight) ? WCAG.AAA_LARGE : WCAG.AAA_NORMAL) : (isLargeText(fontSize, weight) ? WCAG.AA_LARGE : WCAG.AA_NORMAL)

export const ratio = (a: RGB, b: RGB): number => Math.round(contrastRatio(a, b) * 100) / 100

/** "Redmean" colour distance: cheap, closer to how a designer sees a shift than plain RGB distance. */
export function perceptualDistance(a: RGB, b: RGB): number {
  const rMean = ((a.r + b.r) / 2) * 255
  const dr = (a.r - b.r) * 255
  const dg = (a.g - b.g) * 255
  const db = (a.b - b.b) * 255
  return Math.sqrt((2 + rMean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rMean) / 256) * db * db)
}

export interface PaletteEntry { id: string; name: string; rgb: RGB; scopes: readonly string[] }

/** The palette colour closest to `current` that reaches `needed` against `background`, or null. */
export function nearestPassing(current: RGB, background: RGB, needed: number, palette: readonly PaletteEntry[]): (PaletteEntry & { ratio: number }) | null {
  let best: (PaletteEntry & { ratio: number }) | null = null
  let bestDistance = Infinity
  for (const entry of palette) {
    const r = contrastRatio(entry.rgb, background)
    if (r < needed) continue
    const d = perceptualDistance(current, entry.rgb)
    if (d < bestDistance) { bestDistance = d; best = { ...entry, ratio: Math.round(r * 100) / 100 } }
  }
  return best
}

/** The palette colour closest to `current` (for a raw value that should have been a token). Null beyond `maxDistance`. */
export function nearestColor(current: RGB, palette: readonly PaletteEntry[], maxDistance = 40): (PaletteEntry & { distance: number }) | null {
  let best: (PaletteEntry & { distance: number }) | null = null
  for (const entry of palette) {
    const distance = perceptualDistance(current, entry.rgb)
    if (distance <= maxDistance && (!best || distance < best.distance)) best = { ...entry, distance }
  }
  return best
}

export const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`
export const truncate = (s: string, n = 48): string => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)
