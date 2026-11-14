import { scaleGaps } from '../../brand/scaleGaps'
/** Figma ↔ code contract for CodeSnippet ("Code Snippet" 40000160:7266). */
export const figma = {
  setId: '40000160:7266',
  name: 'Code Snippet',
  props: { Language: 'language', Code: 'code', 'Copy (instance)': 'onCopy + copyLabel' },
  figmaGaps: { ...scaleGaps('icon/size/lg', 'font/weight-strong', 'font/weight-regular'), 'icon/glyph/default': 'consumed by the composed Icon (the Tab Icons copy instance in Figma)' },
  notes: 'Created 2026-09-23. Figma shows the block open — a disclosure triangle has no meaning on a static card — so the code drops the <details> wrapper too.',
} as const
