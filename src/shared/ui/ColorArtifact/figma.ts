const header = 'Bound on the nested Artifact Header instance; the composed <ArtifactHeader> consumes it in ArtifactHeader.css.'
const chip = 'Bound on the nested Context Chip (Type=Citation) instances of the Alias chain; the composed <ContextChip type="citation"> consumes it in ContextChip.css.'
const badge = 'Bound on the nested Meta Badge instances of the Usage row; the composed <MetaBadge> consumes it in MetaBadge.css.'

/** Figma ↔ code contract for ColorArtifact ("Color Artifact" 40000285:8157). */
export const figma = {
  setId: '40000285:8157',
  name: 'Color Artifact',
  props: {
    'Artifact Header (instance: Title / Subtitle overrides)': 'variable + title + subtitle + onOpen',
    'Brands › Brand Swatch × 5 (Brand / Hex overrides; Swatch fill → surface/accent in an explicit brand mode)': 'swatches + variable',
    'Alias chain › Context Chip × 3 (Type=Citation, Label override)': 'chain',
    'Usage › Meta Badge × 4 (Tone=Accent / Success, Label override)': 'usage',
  },
  figmaGaps: {
    'uxai/space/inline': header,
    'uxai/chip/bg': chip,
    'uxai/chip/border': chip,
    'uxai/radius/chip': chip,
    'uxai/space/hair': chip,
    'border/accent': badge,
    'feedback/success': badge,
    'radius/pill': badge,
    'space/inline-xs': badge,
    'space/inline-sm': badge,
    'space/inset-xs': badge,
  },
  derivedGaps: {
    '--bb-derived-color-artifact-context-chip-stroke-width': 'Stroke weight of the nested Context Chip instances; ContextChip.css draws it from --bb-derived-context-chip-root-stroke-width (same 1px).',
    '--bb-derived-color-artifact-meta-badge-stroke-width': 'Stroke weight of the nested Meta Badge instances; MetaBadge.css draws it from border/width/default (same 1px).',
  },
  notes: 'Created 2026-10-09 for the UX AI chat. No component properties; everything is data. Each Brand Swatch instance overrides its Swatch fill to surface/accent and sets an explicit Brand UI mode — code passes `brand` (data-brand on the swatch) and paints the swatch with the variable, so the five chips are the real per-brand values of the token, not hard-coded hexes. The CSS reads surface/accent as the default; the `variable` prop repaints inline. The "→" separators are text layers between the chips.',
} as const
