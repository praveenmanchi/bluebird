/** Figma ↔ code contract for IssueType ("Issue Type" 40000265:8019). */
export const figma = {
  setId: '40000265:8019',
  name: 'Issue Type',
  props: {
    Type: 'type (Story / Bug / Task / Epic / Subtask)',
  },
  figmaGaps: {},
  notes: 'Created 2026-10-09 for the Jira tab. Glyph paths are the Figma "Vector" layers, drawn in an SVG whose viewBox is the layer bounding box so the derived width/height tokens size it. Story, Bug and Epic fill their glyph with per-type tokens (jira/type/{story,bug,epic}-glyph, added because Story and Epic are light squares that need a dark glyph); Task and Subtask still stroke with the shared jira/type/glyph — the set description ("glyph from jira/type/glyph") predates the per-type tokens. Task\'s vector sits 0.1 below centre in Figma; the code centres it.',
} as const
