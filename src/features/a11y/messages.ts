// This tab's wire contract. Every type is prefixed with the tab id so it can
// never collide with another tab's messages.
import * as z from 'zod/mini'
import { STANDARD_IDS, type StandardId } from './standards'

export const MSG = {
  scan: 'a11y:scan',
  focus: 'a11y:focus',
  selectAll: 'a11y:select-all',
  applyFix: 'a11y:apply-fix',
  annotate: 'a11y:annotate',
  progress: 'a11y:progress',
  /** What a scan of the scope would read (Ready to scan's heading and counts). Read-only. */
  target: 'a11y:target',
  /** Opens the W3C Quick Reference for the chosen standard ("Check rules"); the sandbox owns the URL. */
  openRules: 'a11y:open-rules',
  /** Draws the Figma report (Export › Figma report) beside the scope. */
  createReport: 'a11y:create-report',
  /** Draws the developer spec for the selected screen (Export › Developer spec). */
  createSpec: 'a11y:create-spec',
} as const


/** What Ready to scan describes: the selection (or page) a scan would read. */
export interface ScanTarget {
  scope: ScanScope
  /** The selected layer's name, "3 layers", or the page name. */
  name: string
  /** Layers selected (0 for nothing selected; the page's top-level layers for a page). */
  selected: number
  /** How many of those are frames (frames, components, sections). */
  frames: number
  textLayers: number
  instances: number
  /** The walk stopped at TARGET_NODE_LIMIT; counts are "at least". */
  truncated: boolean
}

/** Enough to describe a busy page without stalling the sandbox on every selection change. */
export const TARGET_NODE_LIMIT = 5000

export const scanScopeSchema = z.enum(['selection', 'page'])
export type ScanScope = z.infer<typeof scanScopeSchema>

export const targetRequestSchema = z.object({ scope: scanScopeSchema })

export const platformSchema = z.enum(['web', 'ios', 'android'])

export const standardSchema = z.enum(STANDARD_IDS)

/** "Check rules": which version's Quick Reference to open. Default WCAG 2.2. */
export const openRulesRequestSchema = z.object({ standard: z.optional(standardSchema) })

export const scanRequestSchema = z.object({
  scope: scanScopeSchema,
  /** Which target-size minimum applies (WCAG on the web, Apple HIG on iOS, Material on Android). Default web. */
  platform: z.optional(platformSchema),
  /** Which WCAG version's criteria to check (2.0 has no non-text or target-size rules; 2.1 no 24 px minimum). Default 2.2. */
  standard: z.optional(standardSchema),
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
  /** The minimum this finding is measured against: 24 / 44 px on the web, 44 pt on iOS, 48 dp on Android. */
  required: number
  /** The platform whose minimum applies; absent means web (scans before platforms existed). */
  platform?: 'web' | 'ios' | 'android'
  /** The WCAG version it was measured against; absent means 2.2 (scans before standards existed). */
  standard?: StandardId
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

/** Atomic-design level, read from how deeply a component nests other components:
 *  an atom holds none, a molecule holds atoms, an organism holds molecules or deeper. */
export type ComponentLevel = 'atom' | 'molecule' | 'organism'

/** One distinct main component met in the scan (all its instances count as one). */
export interface ScannedComponent {
  key: string
  name: string
  level: ComponentLevel
  instances: number
  /** True when a finding sits in this component's own layers (not in a nested component). */
  failing: boolean
}

/** A top-level frame in scope. It fails when anything inside it does. */
export interface ScannedFrame {
  nodeId: string
  name: string
  failing: boolean
}

/** What the scan walked, for the Scan Summary dashboard. */
export interface ScanInventory {
  components: readonly ScannedComponent[]
  frames: readonly ScannedFrame[]
}

export interface ScanResult {
  scope: ScanScope
  meta: ScanMeta
  /** The WCAG version the scan checked against; absent means 2.2 (scans before standards existed). */
  standard?: StandardId
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
  /** Components and frames in scope with their pass/fail. Absent from scans made before 2026-10-11. */
  inventory?: ScanInventory
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

const hex = z.string().check(z.regex(/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/))
const pairSchema = z.object({ fg: hex, bg: hex })

/** Colours the UI reads from the active brand's CSS; the user's file has none of Bluebird's variables. */
export const docThemeSchema = z.object({
  page: hex, subtle: hex, border: hex, borderStrong: hex, title: hex, body: hex, meta: hex, accent: hex,
  severity: z.object({ critical: pairSchema, serious: pairSchema, moderate: pairSchema, minor: pairSchema, pass: pairSchema }),
  annotation: z.object({ focus: hex, heading: hex, landmark: hex, on: hex }),
  banner: z.object({ bg: hex, text: hex }),
  logoSvg: z.string().check(z.maxLength(200_000)),
})

export const docBrandingSchema = z.object({
  documentType: z.string().check(z.minLength(1)),
  createdAt: z.string().check(z.minLength(1)),
  documentId: z.string().check(z.minLength(1)),
  file: z.string(),
  version: z.string(),
})

/** The report content is built by the UI (doc/report-doc.ts); only its outline is checked here. */
export const createReportRequestSchema = z.object({
  theme: docThemeSchema,
  branding: docBrandingSchema,
  doc: z.looseObject({ kind: z.literal('report'), title: z.string(), issues: z.array(z.unknown()) }),
})

export const createSpecRequestSchema = z.object({
  theme: docThemeSchema,
  branding: docBrandingSchema,
  audit: z.object({ standard: z.optional(standardSchema), platform: platformSchema, openIssues: z.nullable(z.number().check(z.int(), z.nonnegative())) }),
})

/** The frame Bluebird drew, so the UI can say where it went. */
export interface CreatedDocument { nodeId: string; name: string }
