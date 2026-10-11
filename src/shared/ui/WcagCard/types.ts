/**
 * WcagCard public types.
 *
 * Everything in this file is **code-only**: it closes the eleven card-level
 * gaps found in the 2026-09-23 market analysis and has no counterpart in the
 * Figma set (419:39993) yet. Each type carries the gap number it closes so the
 * Figma file can catch up set by set. No new tokens: every part styles itself
 * from the semantic scale already generated from Figma variables.
 */
import type { ComponentChildren } from 'preact'
import type { DisabilityKind } from '../DisabilityIndicator/DisabilityIndicator'
import type { MetaBadgeTone } from '../MetaBadge/MetaBadge'

/** Which face of the card is showing — one per check type. Figma `Mode=colors` (contrast), `Mode=Text`
 *  (typography), `Mode=Touch target` and `Mode=Vision` (colour-vision simulators, 2026-10-11). */
export type WcagCardMode = 'colors' | 'text' | 'touch' | 'vision'

/** Impact ranking, so a page of findings can be ordered and triaged (gap 5). */
export type WcagCardSeverity = 'critical' | 'serious' | 'moderate' | 'minor'

/** How this finding compares with the previous scan of the same scope (gap 10). */
export type WcagCardChange = 'new' | 'existing' | 'fixed' | 'regressed'

/** Lifecycle of the dev-facing annotation (gap 7). */
export type WcagCardAnnotationState = 'none' | 'queued' | 'placed'

/** What an ignore applies to (gap 6). */
export type WcagCardIgnoreScope = 'node' | 'pair' | 'component'

/** A Figma variable behind a raw value — the developer-readable half of a hex (gap 3). */
export interface WcagCardToken {
  /** Variable path as Figma spells it, e.g. "Brand/Text/Secondary". */
  name: string
  /** Mode the value was read in, e.g. "Bridge". */
  mode?: string
}

/** Type metrics for `mode="text"`, where colour swatches say nothing (gap 1). */
export interface WcagCardTextMetrics {
  size?: ComponentChildren
  weight?: ComponentChildren
  lineHeight?: ComponentChildren
  letterSpacing?: ComponentChildren
  /** Line length in characters — 1.4.8 wants ≤ 80. */
  measure?: ComponentChildren
  /** True when the pair qualifies for the 3:1 large-text threshold. */
  largeText?: boolean
}

/** The concrete remediation, ideally a token rather than a hex (gap 2). */
export interface WcagCardFix {
  /** Token to rebind to. Preferred over `value`: it survives brand switches. */
  token?: WcagCardToken
  /** Resulting foreground, for the "after" swatch. */
  value?: string
  /** Background the fix is measured against; defaults to the card's `colors.bg`. */
  on?: string
  /** Ratio the fix achieves, e.g. "5.12:1". */
  ratio?: ComponentChildren
  /** Overrides the generated "Rebind to …" sentence. */
  label?: ComponentChildren
  applyLabel?: ComponentChildren
  /** Omit to render the suggestion read-only. */
  onApply?: () => void
}

/** Verdict for one brand mode — the check only Bluebird can make (gap 4). */
export interface WcagCardBrandVerdict {
  /** Brand label as `plugin.config.json` spells it, e.g. "Bridge". */
  brand: string
  pass: boolean
  ratio?: ComponentChildren
  /** Marks the mode the plugin is currently themed with. */
  current?: boolean
}

/** Roll-up when one colour pair fails on many layers (gap 5). */
export interface WcagCardOccurrences {
  count: number
  /** Caption after the count; defaults to the phrase "affected layers". */
  label?: ComponentChildren
  selectAllLabel?: ComponentChildren
  onSelectAll?: () => void
}

/** A recorded ignore: who, why, how far it reaches and when it lapses (gap 6). */
export interface WcagCardIgnore {
  reason?: ComponentChildren
  scope?: WcagCardIgnoreScope
  author?: ComponentChildren
  /** Free text — "expires 2026-12-01", "until redesign". */
  expires?: ComponentChildren
  undoLabel?: ComponentChildren
  onUndo?: () => void
}

/** State of the annotation the developer will actually read (gap 7). */
export interface WcagCardAnnotation {
  state?: WcagCardAnnotationState
  /** Where it lands — defaults to "Dev Mode". */
  target?: ComponentChildren
}

/** One item of the manual review the footer icons only hinted at (gap 8). */
export interface WcagCardManualCheck {
  /** Which footer indicator this belongs under: content / design / code. */
  kind: DisabilityKind
  label: ComponentChildren
  done?: boolean
}

/** Before/after thumbnails of the offending node (gap 9). */
export interface WcagCardThumbnail {
  src: string
  alt: string
  caption?: ComponentChildren
}

/** Implementation guidance for the handoff (gap 11). */
export interface WcagCardSnippet {
  code: string
  /** Shown as the disclosure caption; defaults to "Code". */
  language?: string
  copyLabel?: string
  onCopy?: () => void
}

export const IGNORE_SCOPE_LABEL: Record<WcagCardIgnoreScope, string> = {
  node: 'this layer',
  pair: 'this colour pair',
  component: 'this component',
}

export const CHANGE_LABEL: Record<WcagCardChange, string> = {
  new: 'New',
  existing: 'Existing',
  fixed: 'Fixed',
  regressed: 'Regressed',
}

export const SEVERITY_LABEL: Record<WcagCardSeverity, string> = {
  critical: 'Critical',
  serious: 'Serious',
  moderate: 'Moderate',
  minor: 'Minor',
}

/** Severity → the MetaBadge tone that carries it. */
export const SEVERITY_TONE: Record<WcagCardSeverity, MetaBadgeTone> = {
  critical: 'danger',
  serious: 'danger',
  moderate: 'warning',
  minor: 'neutral',
}

/** Scan-to-scan movement → the MetaBadge tone that carries it. */
export const CHANGE_TONE: Record<WcagCardChange, MetaBadgeTone> = {
  new: 'accent',
  existing: 'neutral',
  fixed: 'success',
  regressed: 'danger',
}
