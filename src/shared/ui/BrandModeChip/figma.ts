/** Figma ↔ code contract for BrandModeChip ("Brand Mode Chip" 40000158:7224). */
export const figma = {
  setId: '40000158:7224',
  name: 'Brand Mode Chip',
  props: {
    State: 'pass (Pass / Fail)',
    Current: 'current (Yes / No)',
    Brand: 'brand',
    Ratio: 'ratio',
    'Show ratio': 'ratio !== undefined',
  },
  figmaGaps: { 'icon/glyph/default': 'consumed by the composed Icon (Status error icons instance in Figma)' },
  notes: 'Created 2026-09-23. Five of these make a BrandModes strip — the check no competing plugin can make.',
} as const
