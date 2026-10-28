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
    'footer-chevron (glyph)': 'onExpand',
  },
  figmaGaps: {
    'footer/segment/fg': 'the size expander step label, read by the composed SizeExpander',
  },
  derivedGaps: {
    '--bb-derived-footer-vector--1-width': 'The footer-chevron glyph vector (133:1663, 8.7x8.7 in its 16px frame; seven layers are named "Vector"). Icon draws it; only the glyph box is CSS.',
    '--bb-derived-footer-vector--1-height': 'The footer-chevron glyph vector (133:1663, 8.7x8.7 in its 16px frame; seven layers are named "Vector"). Icon draws it; only the glyph box is CSS.',
  },
  notes: 'The Figma frame is 595px wide; code stretches to the host width. The 16×0 "Line 57/58/59" hairlines are drawn rotated in Figma, so code renders them as 16px-tall vertical rules. footer/segment/radius and footer/padding-x are instance overrides on the size expander and are applied through .bb-footer__size.',
} as const
