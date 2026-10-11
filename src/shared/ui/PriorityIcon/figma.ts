/** Figma ↔ code contract for PriorityIcon ("Priority Icon" 40000265:8035). */
export const figma = {
  setId: '40000265:8035',
  name: 'Priority Icon',
  props: {
    Priority: 'priority (Highest / High / Medium / Low / Lowest)',
  },
  figmaGaps: {},
  notes: 'Created 2026-10-09 for the Jira tab. Chevron paths are the Figma "Vector" layers, drawn in an SVG whose viewBox is the layer bounding box so the derived width/height tokens size it. Highest and High both read jira/priority/high (there is no jira/priority/highest). Stroke cap/join are round in Figma and are not variables.',
} as const
