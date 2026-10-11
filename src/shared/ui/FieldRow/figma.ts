const avatar = 'Bound on the nested Avatar instance; the composed <Avatar> (Avatar.css) consumes it.'

/** Figma ↔ code contract for FieldRow ("Field Row" 40000267:8056). */
export const figma = {
  setId: '40000267:8056',
  name: 'Field Row',
  props: {
    Label: 'label',
    Value: 'children',
    'Show avatar': 'showAvatar',
    'Avatar (instance) › Initials': 'initials',
  },
  figmaGaps: {
    'jira/avatar/bg': avatar,
    'jira/radius/pill': avatar,
    'jira/size/avatar-sm': avatar,
  },
  notes: 'Created 2026-10-09 for the Jira ticket detail. Label and Value share size/family/weight/line tokens and differ only in colour (jira/text/meta vs jira/text/title), so the font sits on the row. Both truncate with an ellipsis in code; Figma does not set truncation on either text.',
} as const
