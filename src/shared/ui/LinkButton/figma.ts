import { scaleGaps } from '../../brand/scaleGaps'
/** Figma ↔ code contract for LinkButton ("Link Button" 40000157:7205). */
export const figma = {
  setId: '40000157:7205',
  name: 'Link Button',
  props: { Label: 'children', Icon: 'icon', 'Show icon': 'icon (null hides it)' },
  figmaGaps: { ...scaleGaps('font/weight-regular') },
  notes: 'Created 2026-09-23. 2026-11-13 pull: the root is an auto-layout row with gap and all four paddings on dimension/space/2 (22 tall), the label fill moved from text/accent to text/primary (the underline is what marks it as a link), and the trailing icon is an icon/size/md instance. Trailing Icon + Show icon added 2026-11-13; every instance picks its glyph from the label, mirrored in linkIcon.ts (link open only for links that leave the plugin, back links show none).',
} as const
