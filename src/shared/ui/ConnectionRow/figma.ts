/** Figma ↔ code contract for ConnectionRow ("Connection Row" 40000275:8211). */
export const figma = {
  setId: '40000275:8211',
  name: 'Connection Row',
  props: {
    Name: 'name',
    Detail: 'detail',
    'Show action': 'showAction',
    'Action (Link Button instance, Label "Switch")': 'actionLabel + onAction',
    'Status icon (Status error icons instance, Status=Good)': 'status (defaults to good → Icon status-good)',
  },
  figmaGaps: {},
  notes: 'Created 2026-10-09 for the MCP tab. The Status icon is a fixed "Status error icons" Status=Good instance in Figma; `status` (good / issue / error) is a code-only extension for a degraded connection and defaults to the Figma look. The icon is coloured with the connection/icon/* tokens the icon set binds and named for assistive tech. The Text frame (~32) does not fit the FIXED 40 root with 9 + 9 padding; Figma centres it and lets it overflow the padding, and the CSS keeps that.',
} as const
