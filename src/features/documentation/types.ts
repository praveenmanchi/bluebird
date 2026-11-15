// The Documentation tab's domain types, shared by the UI, the mock and the sandbox.

/** Figma "Modes" row. Style guide is on hold: the segment shows, the flow is not built. */
export type DocMode = 'components' | 'handoff' | 'styleguide'

// ── Components ────────────────────────────────────────────────────────────────

/** Figma "Sections to include". */
export type SectionId = 'anatomy' | 'properties' | 'tokens' | 'brands' | 'a11y' | 'code'

export const SECTIONS: ReadonlyArray<readonly [SectionId, string, string]> = [
  ['anatomy', 'Anatomy', 'numbered layer markers'],
  ['properties', 'Properties and variants', 'matrix of existing variants'],
  ['tokens', 'Tokens used', 'grouped by layer'],
  ['brands', 'Brand differences', 'only where values differ'],
  ['a11y', 'Accessibility notes', 'measured on the default variant'],
  ['code', 'Code snippet', 'from the variant properties'],
]

export type ComponentKind = 'Component set' | 'Component' | 'Variant'

/** What the Configure screen shows about the selection. */
export interface ComponentSummary {
  nodeId: string
  name: string
  kind: ComponentKind
  variants: number
  /** Property names, in Figma's order. */
  properties: readonly string[]
  tokens: number
  nested: number
  rawValues: number
  /** Modes of the brand collection the component's tokens resolve through. */
  brands: readonly string[]
  /** PNG data URL of the default variant; null when Figma could not export it. */
  preview: string | null
}

export interface AnatomyPart {
  n: number
  name: string
  detail: string
  /** Marker position on the preview, 0–1 of its width and height. */
  x: number
  y: number
}

export interface DocProperty { name: string; value: string }

export interface DocToken {
  name: string
  kind: 'color' | 'number'
  /** Fill, Text, Corner radius, Padding x … */
  role: string
  layer: string
  /** The variable this one points at, when it is an alias. */
  alias: string | null
  /** Resolved in the collection's default mode: a hex or a number. */
  value: string
}

export interface BrandValue { brand: string; value: string }

export interface BrandDiff { token: string; values: readonly BrandValue[] }

export type CheckStatus = 'pass' | 'warning' | 'fail'

export interface DocCheck { status: CheckStatus; title: string; detail: string }

/** One generated component doc. Stored on the component so a later visit can tell it is out of date. */
export interface ComponentDoc {
  nodeId: string
  name: string
  kind: ComponentKind
  variants: number
  generatedAt: string
  /** Plugin build that generated it. */
  version: string
  brands: readonly string[]
  sections: readonly SectionId[]
  preview: string | null
  anatomy: readonly AnatomyPart[]
  properties: readonly DocProperty[]
  tokens: readonly DocToken[]
  brandDiff: BrandDiff | null
  checks: readonly DocCheck[]
  code: string
  /** Hash of the properties, variants and token values the doc was built from. */
  fingerprint: string
  /** The doc frame's node id; null when it was not drawn. */
  frameId: string | null
}

// ── Hand-off ──────────────────────────────────────────────────────────────────

export interface PageInfo { id: string; name: string; screens: number; flows: number }

export type FindingCategory = 'spacing' | 'components' | 'names' | 'prototype' | 'values'

export const CATEGORY_LABEL: Readonly<Record<FindingCategory, string>> = {
  spacing: 'Hard-coded spacing',
  components: 'Not components',
  names: 'Unnamed layers',
  prototype: 'Not in the prototype',
  values: 'Raw colours and type',
}

export interface Finding {
  id: string
  category: FindingCategory
  severity: 'serious' | 'moderate' | 'minor'
  title: string
  meta: string
  fix: string
  /** The layer Locate selects. */
  nodeId: string
}

/** One line of the audit pop-up. */
export interface AuditLine { category: FindingCategory; status: CheckStatus; title: string; detail: string }

export interface AuditResult {
  pages: readonly string[]
  screens: number
  flows: number
  links: number
  lines: readonly AuditLine[]
  findings: readonly Finding[]
}

export type Tier = 'atoms' | 'molecules' | 'organisms' | 'icons' | 'other'

/** What one screen of a page holds, as the sandbox reads it. `model.ts` turns these into findings. */
export interface ScreenScan {
  id: string
  name: string
  page: string
  unboundGaps: ReadonlyArray<{ id: string; name: string; gap: number }>
  /** Named, non-instance frames with children: candidates for "repeated frames aren't components". */
  frames: ReadonlyArray<{ id: string; name: string }>
  defaultNamed: ReadonlyArray<{ id: string; name: string }>
  rawColors: number
  rawTextSizes: number
  /** Has a prototype link in or out. */
  linked: boolean
  components: ReadonlyArray<{ name: string; tier: Tier }>
}

export interface PageScan { id: string; name: string; flows: number; links: number; screens: readonly ScreenScan[] }

export type IncludeId = 'flow' | 'screens' | 'components' | 'issues'

export const INCLUDES: ReadonlyArray<readonly [IncludeId, string]> = [
  ['flow', 'User flow from the prototype'],
  ['screens', 'Screens, in canvas order'],
  ['components', 'Atoms, molecules and organisms used'],
  ['issues', 'Known issues you ignored'],
]

export const AUDIENCES = ['Development team', 'QA team', 'Product owner'] as const
export const DRAFT_VERSIONS = ['Draft v0.1', 'Draft v0.2', 'Version 1.0'] as const

export interface Ticket { key: string; summary: string; status: string }

export interface HandoffSection { status: CheckStatus; title: string; detail: string }

export interface HandoffResult {
  title: string
  version: string
  createdAt: string
  /** label → value rows of "What's in it". */
  facts: ReadonlyArray<readonly [string, string]>
  sections: readonly HandoffSection[]
  ticket: string | null
  /** The hand-off frame; null when it could not be drawn. */
  frameId: string | null
  /** The text Post to Jira sends. */
  summary: string
}

export interface ProgressStep { label: string; status: 'done' | 'running' | 'queued' }
