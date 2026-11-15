import { scaleGaps } from '../../brand/scaleGaps'
/** Figma ↔ code contract for Footer ("footer" 133:1675). */
export const figma = {
  setId: '133:1675',
  name: 'footer',
  props: {
    Git: 'git (or pills[0])',
    UXAI: 'uxai (or pills[1])',
    MCP: 'mcp (or pills[2])',
    'Dual File': 'dualFile (or pills[3])',
    'info (instance)': 'meta',
    'size expander (instance)': 'size / onSizeChange',
    'Minimize (minimize-corners icon)': 'onMinimize',
    'Intro info (Footer Info instance)': 'onHelp / helpActive',
  },
  figmaGaps: {
    ...scaleGaps('dimension/space/6', 'dimension/space/5', 'dimension/space/3', 'dimension/opacity/30'),
    'footer/segment/fg': 'the size expander step label, read by the composed SizeExpander',
    'dimension/space/18': 'The old size-group gap. Figma regrouped the controls on 2026-11-15 (one row at space/inline-md); the committed snapshot predates it and the next pull drops this binding.',
  },
  derivedGaps: {
    '--bb-derived-footer-frame-1430102625-gap': 'The old 29px controls gap from the mirrored Minimize / grip frames. Figma regrouped the row on 2026-11-15 to space/inline-md (8px); the next pull drops this derived value.',
    '--bb-derived-footer-frame-width': 'The resize grip’s outer 16px Frame (133:1665); code sizes the grip from its Container (footer-container-*), also 16px.',
    '--bb-derived-footer-frame-height': 'The resize grip’s outer 16px Frame (133:1665); code sizes the grip from its Container (footer-container-*), also 16px.',
  },
  notes: 'The Figma frame is 595px wide; code stretches to the host width. The 16×0 "Line 57/58/59" hairlines are drawn rotated in Figma, so code renders them as 16px-tall vertical rules. footer/segment/radius and footer/padding-x are instance overrides on the size expander and are applied through .bb-footer__size.',
} as const
