import { scaleGaps } from '../../brand/scaleGaps'
const secondary = 'Bound on the nested Button (Type=Secondary — No changes, Failed "View log", Empty file); the composed <Button variant="secondary"> (Button.css) consumes it.'
const primary = 'Bound on the nested Button (Type=Primary — Not connected, Failed "Retry build", First release, Ready to extract); the composed <Button variant="primary"> (Button.css) consumes it.'

/** Figma ↔ code contract for PublishEmptyState ("Publish Empty State" 40000346:8697). */
export const figma = {
  setId: '40000346:8697',
  name: 'Publish Empty State',
  props: {
    State: 'state (No changes → no-changes / Not connected → not-connected / Failed → failed / First release → first-release / Empty file → empty-file / Ready to extract → ready-to-extract)',
    'Title / Body text (not exposed as Figma props)': 'title / body overrides (defaults are the per-State copy)',
    'Actions (Button instances) › Label + Type': 'actions [{ label, variant, onClick, disabled }] (defaults are the per-State Buttons)',
    'Icon box › Status error icons / Tab Icons instance': 'state → Icon status-good / git-merg / status-error / change-log / layers / extract',
  },
  figmaGaps: {
    ...scaleGaps('icon/size/lg', 'icon/size/sm', 'button/secondary/border-width', 'button/primary/border-width'),
    'button/secondary/bg/default': secondary,
    'button/secondary/border/default': secondary,
    'button/secondary/radius': secondary,
    'button/secondary/gap': secondary,
    'button/secondary/padding-x': secondary,
    'button/secondary/height': secondary,
    'button/secondary/width-md': `${secondary} Read under [data-width="fixed"], which PublishEmptyState sets.`,
    'button/primary/bg/default': primary,
    'button/primary/border/default': primary,
    'button/primary/radius': primary,
    'button/primary/gap': primary,
    'button/primary/padding-x': primary,
    'button/primary/height': primary,
    'button/primary/width-md': `${primary} Read under [data-width="fixed"], which PublishEmptyState sets.`,
  },
  derivedGaps: {
    '--bb-derived-publish-empty-state-root-width': 'Figma fixes the state at 400 (the plugin panel width); code fills its parent (width: 100%) so it centres in any panel size.',
  },
  notes: 'Code-only `icon` overrides the State’s glyph with a 24 Tab Icons glyph, mirroring instance icon swaps (the MCP tab reuses this card). Created 2026-10-11 for the Publish tab. Each State swaps the Icon box glyph: No changes / Failed use a 16 "Status error icons" instance (Good / error), sized with publish/size/icon and coloured with the connection/icon/* tokens that set binds; Not connected / First release / Empty file / Ready to extract use a 24 "Tab Icons" instance (git merg / Change Log / layers / Extract) with no bound size or colour, so it renders as <Icon size="lg" tone="default">. Title and Body copy and the Buttons are not Figma component properties — they live in the variants — so code keeps them per State with overrides; default actions carry no handlers, pass `actions` to wire them. Buttons are FIXED at button/*/width-md in Figma → width="fixed". The Failed state is announced with role="alert"; the Title is an h3.',
} as const
