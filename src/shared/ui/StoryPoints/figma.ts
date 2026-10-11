/** Figma ↔ code contract for StoryPoints ("Story Points" 40000265:8036). */
export const figma = {
  setId: '40000265:8036',
  name: 'Story Points',
  props: {
    Points: 'children',
  },
  figmaGaps: {},
  notes: 'Created 2026-10-09 for the Jira tab. The 1px stroke weight is raw in Figma (jira/border-width exists but is not bound), so it is read through --bb-derived-story-points-root-stroke-width. The Figma description calls it "editable in the ticket detail"; editing is left to the screen that owns the data.',
} as const
