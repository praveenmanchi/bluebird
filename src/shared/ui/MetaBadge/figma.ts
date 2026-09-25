/** Figma ↔ code contract for MetaBadge ("Meta Badge" 40000156:7214). */
export const figma = {
  setId: '40000156:7214',
  name: 'Meta Badge',
  props: {
    Tone: 'tone (Neutral / Accent / Success / Warning / Danger)',
    Label: 'children',
    Meta: 'meta',
    'Show meta': 'meta !== undefined',
  },
  figmaGaps: {},
  notes: 'Created 2026-09-23 alongside the WCAG Card gap work. Severity uses Tone=Danger; the change badge uses Tone=Accent with Show meta on.',
} as const
