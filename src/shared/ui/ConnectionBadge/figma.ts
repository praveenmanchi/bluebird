/** Figma ↔ code contract for ConnectionBadge. */
export const figma = {
  setId: '417:6735',
  name: 'Connection',
  props: { 'Property 1': 'status (Default = retry, Variant2 = good, Variant3 = error)' },
  figmaGaps: {
    'icon/glyph/default': 'The badge background is bound to the generic glyph colour in Figma, which would paint a dark tile behind the status icon. Code uses connection/bg/default (present in the Brand collection for this badge) and colours the icon through connection/icon/ok|warn|error. Rebind the frame fill in Figma to close the gap.',
  },
  notes: 'The nested "Status error icons" instance selects the glyph: Retry → status-retry, Good → status-good, error → status-error.',
} as const
