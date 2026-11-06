const issueType = 'Bound on the nested "Issue Type" instance; the composed <IssueType> (IssueType.css) consumes it.'
const priority = 'Bound on the nested "Priority" instance; the composed <PriorityIcon> (PriorityIcon.css) consumes it.'
const points = 'Bound on the nested "Story Points" instance; the composed <StoryPoints> (StoryPoints.css) consumes it.'
const avatar = 'Bound on the nested "Assignee" Avatar instance; the composed <Avatar> (Avatar.css) consumes it.'
const status = 'Bound on the nested "Status" Meta Badge instance; the composed <MetaBadge> (MetaBadge.css) consumes it.'

/** Figma ↔ code contract for TicketRow ("Ticket Row" 40000267:8055). */
export const figma = {
  setId: '40000267:8055',
  name: 'Ticket Row',
  props: {
    Key: 'issueKey',
    Title: 'title',
    State: 'selected (Selected) | state="hover" (Hover; real :hover applies the same rule)',
    'Issue Type (instance) › Type': 'issueType',
    'Status (Meta Badge instance) › Label + Tone': 'status + statusTone',
    'Priority (instance) › Priority': 'priority',
    'Story Points (instance) › Points': 'points',
    'Assignee (Avatar instance) › Initials': 'assignee (+ assigneeName for the accessible name)',
    'Show assignee': 'showAssignee',
  },
  figmaGaps: {
    'jira/type/story': issueType,
    'jira/radius/icon': issueType,
    'jira/size/icon': `${issueType} Also bound on "Priority"; ${priority}`,
    'jira/points/bg': points,
    'jira/points/border': points,
    'jira/space/hair': points,
    'jira/radius/pill': `${points} Also bound on "Assignee"; ${avatar}`,
    'jira/avatar/bg': avatar,
    'jira/size/avatar-sm': avatar,
    'border/accent': status,
    'radius/pill': status,
    'space/inline-xs': status,
    'space/inline-sm': status,
    'space/inset-xs': status,
  },
  derivedGaps: {},
  notes: 'Created 2026-10-09 for the Jira tab. The row is a <button aria-pressed> so it is focusable and selectable; onSelect receives the issue key. Every variant uses the same nested instances (Story / IN PROGRESS accent / High / 5 / PM); the Figma description says to swap them per issue, so each is a prop. Only State=Selected carries a stroke, and Figma lays it out inside (Top is 374 wide instead of 376), which the border-box border reproduces.',
} as const
