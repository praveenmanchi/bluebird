/** Figma ↔ code contract for Avatar ("Avatar" 40000265:8042). */
export const figma = {
  setId: '40000265:8042',
  name: 'Avatar',
  props: {
    Size: 'size (Small → sm / Medium → md)',
    Initials: 'children',
  },
  figmaGaps: {},
  notes: 'Created 2026-10-09 for the Jira tab (assignee, reporter, comment author). `name` is code-only: it gives the circle an accessible name instead of the bare initials.',
} as const
