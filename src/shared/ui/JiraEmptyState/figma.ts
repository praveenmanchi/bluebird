import { scaleGaps } from '../../brand/scaleGaps'
const secondary = 'Bound on the nested "Action" Button (Type=Secondary — No tickets, Error); the composed <Button variant="secondary"> (Button.css) consumes it.'
const primary = 'Bound on the nested "Action" Button (Type=Primary — Not connected); the composed <Button variant="primary"> (Button.css) consumes it.'

/** Figma ↔ code contract for JiraEmptyState ("Jira Empty State" 40000268:8127). */
export const figma = {
  setId: '40000268:8127',
  name: 'Jira Empty State',
  props: {
    State: 'state (No tickets → no-tickets / Not connected → not-connected / Error → error)',
    'Title / Body text (not exposed as Figma props)': 'title / children overrides (defaults are the per-State copy)',
    'Action (Button instance) › Label + Type': 'actionLabel (+ onAction); Type follows State',
    'Action › width FIXED (button/*/width-md)': 'width="fixed" (120 wide in Figma)',
  },
  figmaGaps: {
    ...scaleGaps('button/secondary/border-width', 'button/primary/border-width'),
    'button/secondary/bg/default': secondary,
    'button/secondary/border/default': secondary,
    'button/secondary/radius': secondary,
    'button/secondary/gap': secondary,
    'button/secondary/padding-x': secondary,
    'button/secondary/height': secondary,
    'button/secondary/width-md': `${secondary} Read under [data-width="fixed"], which JiraEmptyState sets.`,
    'button/primary/bg/default': primary,
    'button/primary/border/default': primary,
    'button/primary/radius': primary,
    'button/primary/gap': primary,
    'button/primary/padding-x': primary,
    'button/primary/height': primary,
    'button/primary/width-md': `${primary} Read under [data-width="fixed"], which JiraEmptyState sets.`,
  },
  derivedGaps: {},
  notes: 'Created 2026-10-09 for the Jira tab. The Icon is a Tab Icons "Jira" instance at 24 with no bound size or colour, so it renders as <Icon size="lg" tone="default"> (icon/size/lg = 24, icon/glyph/default). Title and Body texts are not Figma component properties — the copy lives in the variants — so code keeps it per state with overrides. The Error state is announced with role="alert".',
} as const
