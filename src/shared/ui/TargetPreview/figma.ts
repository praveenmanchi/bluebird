import { scaleGaps } from '../../brand/scaleGaps'
const scanned = 'Scanned size × zoom, set inline from width / height / minimum / enhanced / spacing. Figma pins the 18 × 18 (Fail) and 24 × 24 (Pass) example at 200%.'

/** Figma ↔ code contract for TargetPreview ("Target Preview" 40000463:9175). */
export const figma = {
  figmaGaps: { ...scaleGaps('type/size/16_2', 'font/family-ui', 'type/line/18', 'type/size/21_6', 'type/line/24') },
  setId: '40000463:9175',
  name: 'Target Preview',
  props: {
    State: 'state (derived by targetState() from width / height / spacing / minimum when omitted)',
    'Canvas · Target / Neighbour / boxes': 'width / height / spacing / minimum / enhanced / zoom',
    Glyph: 'glyph',
  },
  derivedGaps: {
    '--bb-derived-target-preview-canvas-width': 'The canvas fills the root (width: 100%), capped by root-width.',
    '--bb-derived-target-preview-enhanced-44-44-width': scanned,
    '--bb-derived-target-preview-enhanced-44-44-height': scanned,
    '--bb-derived-target-preview-minimum-24-24-width': scanned,
    '--bb-derived-target-preview-minimum-24-24-height': scanned,
    '--bb-derived-target-preview-spacing-circle-24px-width': scanned,
    '--bb-derived-target-preview-spacing-circle-24px-height': scanned,
    '--bb-derived-target-preview-target-state-fail-width': scanned,
    '--bb-derived-target-preview-target-state-fail-height': scanned,
    '--bb-derived-target-preview-target-state-pass-width': scanned,
    '--bb-derived-target-preview-target-state-pass-height': scanned,
    '--bb-derived-target-preview-neighbour-width': 'Code sizes the neighbour like the target (smallest side × zoom) — the scan does not measure the neighbour.',
    '--bb-derived-target-preview-neighbour-height': 'as neighbour-width.',
    '--bb-derived-target-preview-gap-marker-state-fail-width': scanned,
    '--bb-derived-target-preview-gap-marker-state-pass-width': scanned,
    '--bb-derived-target-preview-gap-marker-height': 'A zero-height Line in Figma; code draws it as a border-top.',
  },
  notes: 'Created 2026-10-11 for the WCAG card Mode=Touch target preview. Fail draws an 18 × 18 target 4px from an "i" neighbour; Pass a 24 × 24 target 24px away. targetState() approximates the 2.5.8 spacing exception for a same-sized neighbour.',
} as const
