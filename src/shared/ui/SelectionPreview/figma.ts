const ticketRow = 'Bound on the nested Ticket Row thumbnail instance; the composed <TicketRow> reads it in TicketRow.css.'
const badge = 'Bound on a nested Meta Badge instance; the composed <MetaBadge> reads it in MetaBadge.css.'

/** Figma ↔ code contract for SelectionPreview ("Selection Preview" 40000287:8278). */
export const figma = {
  setId: '40000287:8278',
  name: 'Selection Preview',
  props: {
    Name: 'name',
    Meta: 'meta',
  },
  figmaGaps: {
    'jira/row/bg/selected': ticketRow,
    'jira/row/border/selected': ticketRow,
    'jira/radius/row': ticketRow,
    'jira/space/tight': ticketRow,
    'jira/space/row-x': ticketRow,
    'jira/space/row-y': ticketRow,
    'border/accent': badge,
    'border/subtle': badge,
    'feedback/success': badge,
    'radius/pill': badge,
    'space/inline-xs': badge,
    'space/inline-sm': badge,
    'space/inset-xs': badge,
  },
  derivedGaps: {
    '--bb-derived-selection-preview-meta-badge-stroke-width': 'MetaBadge draws its own 1px border.',
    '--bb-derived-selection-preview-ticket-row-stroke-width': 'Not a stroke to draw: it is the Ticket Row stroke after Figma scaled the instance (1 → 0.45). SelectionPreview.tsx reads it at runtime as the thumbnail scale factor (figmaScale), so the scale follows Figma.',
  },
  notes: 'Created 2026-10-09 for the UX AI "Selection" screen. The nested Ticket Row is a scaled instance (400×60 → 180×27); code renders the real TicketRow and scales it by the same ratio, read from the derived stroke tokens. `children` replaces the thumbnail for any other selection. The three stat badges and the "Select on canvas" Link Button are not component properties in Figma; they are `stats` / `actionLabel` / `onSelectOnCanvas` here.',
} as const
