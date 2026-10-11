const avatar = 'Bound on the nested Avatar (Size=Medium) instance; the composed <Avatar size="md"> (Avatar.css) consumes it.'

/** Figma ↔ code contract for Comment ("Comment" 40000268:8025). */
export const figma = {
  setId: '40000268:8025',
  name: 'Comment',
  props: {
    Author: 'author',
    Time: 'time (+ dateTime)',
    Body: 'children',
    'Show actions': 'showActions',
    'Avatar (instance) › Initials': 'initials',
    'Actions › Reply / Edit / Delete (Link Button instances)': 'onReply / onEdit / onDelete',
  },
  figmaGaps: {
    'jira/avatar/bg': avatar,
    'jira/radius/pill': avatar,
    'jira/size/avatar': avatar,
  },
  derivedGaps: {
    '--bb-derived-comment-root-height': 'Canvas artefact: the Figma frame is FIXED at 40 while its Content column hugs to 66 and overflows it (see the set screenshot). The comment hugs its content instead of clipping the body.',
  },
  notes: 'Created 2026-10-09 for the Jira ticket detail. Rendered as an <article> with a <header> and <time>. The root frame is FIXED 520×40 but its content is 66 high — the height should be HUG in Figma.',
} as const
