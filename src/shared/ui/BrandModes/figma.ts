const composed = 'Bound on the nested BrandModeChip instance(s); rendered by the composed <BrandModeChip>, whose BrandModeChip.css consumes it. Nothing to read at BrandModes level.'

/** Figma ↔ code contract for BrandModes ("Brand Modes" 40000159:7074). */
export const figma = {
  setId: '40000159:7074',
  name: 'Brand Modes',
  props: { Label: 'label', 'Brand Mode Chip instances': 'modes' },
  figmaGaps: {
    'feedback/danger': composed,
    'feedback/success': composed,
    'radius/pill': composed,
    'space/inline-sm': composed,
    'space/inset-xs': composed,
    'surface/sunken': composed,
  },
  notes: 'Created 2026-09-23. The plugin ships five Brand modes (Bridge / Ikea / Richemont / Disney / Fiskars); the set is seeded with one chip each.',
} as const
