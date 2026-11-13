/** Figma ↔ code contract for ContextChip ("Context Chip" 40000283:8207). */
export const figma = {
  setId: '40000283:8207',
  name: 'Context Chip',
  props: {
    Type: 'type (Selection / Source / Citation)',
    State: 'state (Default / Focus)',
    Label: 'children',
  },
  figmaGaps: {},
  notes: 'Created 2026-10-09 for the UX AI tab; reused by the AI Agents section (Agent Card, Agent Header, Finding Row). Each variant swaps the nested Tab Icons instance: Selection → component select, Source → Variables, Citation → text; `icon` overrides it the way an instance swap does. The glyph keeps the Tab Icons colour (icon/glyph/default).',
} as const
