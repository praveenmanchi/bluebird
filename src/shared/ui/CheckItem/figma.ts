import { scaleGaps } from '../../brand/scaleGaps'
/** Figma ↔ code contract for CheckItem ("Check Item" 40000275:8210). */
export const figma = {
  setId: '40000275:8210',
  name: 'Check Item',
  props: {
    Title: 'title',
    Detail: 'detail',
    Status: 'status (Pass / Warning / Fail)',
    'Status icon (Status error icons instance)': 'status → Icon status-good / status-issue / status-error',
    'Action (Link Button instance, Label "Fix")': 'showAction + actionLabel + onAction',
  },
  figmaGaps: { ...scaleGaps('dimension/space/2', 'icon/size/sm') },
  notes: 'Created 2026-10-09 for the MCP tab. Status picks the nested "Status error icons" variant (Pass → Good, Warning → issue, Fail → error), rendered as <Icon> coloured with the connection/icon/* tokens that set binds; the icon carries the status as its accessible name. The Action Link Button is a hidden layer in Status=Pass with no boolean property, so `showAction` defaults to status !== "pass". The FIXED 30 root height is shorter than its Text frame (~32), so it is applied as min-height.',
} as const
