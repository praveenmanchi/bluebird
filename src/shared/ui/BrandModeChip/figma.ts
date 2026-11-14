import { scaleGaps } from '../../brand/scaleGaps'
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
  figmaGaps: { ...scaleGaps('icon/size/sm', 'font/weight-regular', 'font/weight-strong'), 'icon/glyph/default': 'consumed by the composed Icon (Status error icons instance in Figma)' },
  notes: 'Created 2026-09-23. Five of these make a BrandModes strip — the check no competing plugin can make. Figma draws the Status error icons instance at an unbound 12x12 in every variant (the master is 16); no icon-size variable is 12 and the generator emits no derived size for instances inside a component, so code sizes it with Foundations dimension/space/12 until Figma binds a 12 icon size. Current=Yes makes only Brand Semi Bold; Ratio stays Regular via --bb-derived-brand-mode-chip-ratio-font-weight.',
} as const
