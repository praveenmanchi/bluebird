// This tab's wire contract. Every type is prefixed with the tab id so it can
// never collide with another tab's messages.
import * as z from 'zod/mini'

export const MSG = {
  scan: 'a11y:scan',
  focus: 'a11y:focus',
  selectAll: 'a11y:select-all',
  applyFix: 'a11y:apply-fix',
  annotate: 'a11y:annotate',
  progress: 'a11y:progress',
} as const

export const scanScopeSchema = z.enum(['selection', 'page'])
export type ScanScope = z.infer<typeof scanScopeSchema>

export const scanRequestSchema = z.object({
  scope: scanScopeSchema,
  /** Scan the first instance of each component and skip the rest. Default true. */
  dedupeInstances: z.optional(z.boolean()),
})
export type ScanRequest = z.infer<typeof scanRequestSchema>

export type ContrastLevel = 'fail' | 'aa-large' | 'aa' | 'aaa'

/** A Figma variable, named the way the card shows it. */
export interface WireToken {
  id: string
  name: string
  /** Brand mode the value was read in. */
  mode: string
}

/** The nearest token in the brand palette that would pass. */
export interface ContrastFix {
  tokenId: string
  tokenName: string
  hex: string
  ratio: number
  mode: string
}

/** One brand mode's verdict for the same pair. */
export interface ModeVerdict {
  brand: string
  pass: boolean
  ratio: number
}

export interface ContrastIssue {
  /** The layer the card focuses on — the first one found with this exact finding. */
  nodeId: string
  /** Every layer sharing this colour pair at this size. `Select all` uses it. */
  nodeIds: readonly string[]
  occurrences: number
  name: string
  text: string
  fontSize: number
  isBold: boolean
  foreground: string
  background: string
  ratio: number
  level: ContrastLevel
  /** Variable behind the text colour, when the designer bound one. */
  fgToken?: WireToken
  /** Variable behind the resolved backdrop. */
  bgToken?: WireToken
  /** The same pair judged in every brand mode — only Bluebird can answer this. */
  brandModes?: readonly ModeVerdict[]
  /** Suggested rebind, when the palette holds something that passes. */
  fix?: ContrastFix
  /** True when no opaque layer was found and the ratio is against an assumed
   *  white — the card must say so rather than present it as measured. */
  assumedBackground?: boolean
}

/** WCAG 1.4.11: a border too faint to see against what it sits on. */
export interface NonTextIssue {
  nodeId: string
  nodeIds: readonly string[]
  occurrences: number
  name: string
  /** The stroke colour. */
  foreground: string
  /** What the stroke is measured against. */
  background: string
  ratio: number
}

/** WCAG 2.5.8 / 2.5.5: a tap target smaller than the minimum. */
export interface TargetSizeIssue {
  nodeId: string
  nodeIds: readonly string[]
  occurrences: number
  name: string
  width: number
  height: number
  /** 24 (AA) or 44 (AAA), whichever this finding is measured against. */
  required: number
  /** 'reaction' when Figma told us it is interactive; 'control' when the name did. */
  evidence: 'reaction' | 'control'
}

/** Text whose backdrop could not be measured — an image, gradient or mixed fill. */
export interface UnmeasurableText {
  nodeId: string
  name: string
  text: string
  /** Why, e.g. "sits on an image fill". */
  reason: string
}

/** Where the scan ran, so a report can name its subject. */
export interface ScanMeta {
  file: string
  page: string
  brand: string
}

export interface ScanResult {
  scope: ScanScope
  meta: ScanMeta
  scanned: number
  textNodes: number
  /** Grouped findings: one entry per distinct colour pair at a given size. */
  issues: readonly ContrastIssue[]
  /** WCAG 1.4.11 — borders below 3:1. */
  nonText: readonly NonTextIssue[]
  /** WCAG 2.5.8 / 2.5.5 — targets below 24 / 44 px. */
  targets: readonly TargetSizeIssue[]
  /** Text the standard treats as incidental (inactive controls, logotypes). */
  exempt: number
  /** Text we refuse to guess at, rather than reporting a fabricated ratio. */
  unmeasurable: readonly UnmeasurableText[]
  /** Repeated component instances whose subtree was scanned only once. */
  instancesSkipped: number
  durationMs: number
}

export interface ScanProgress { visited: number }

export const focusRequestSchema = z.object({ nodeId: z.string().check(z.minLength(1)) })
export type FocusRequest = z.infer<typeof focusRequestSchema>

export const selectRequestSchema = z.object({ nodeIds: z.array(z.string()).check(z.minLength(1)) })
export type SelectRequest = z.infer<typeof selectRequestSchema>

export const applyFixRequestSchema = z.object({
  nodeIds: z.array(z.string()).check(z.minLength(1)),
  variableId: z.string().check(z.minLength(1)),
})
export type ApplyFixRequest = z.infer<typeof applyFixRequestSchema>

export const annotateRequestSchema = z.object({
  nodeIds: z.array(z.string()).check(z.minLength(1)),
  label: z.string().check(z.minLength(1)),
})
export type AnnotateRequest = z.infer<typeof annotateRequestSchema>
