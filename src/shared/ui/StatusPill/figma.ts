/** Figma ↔ code contract for StatusPill. */
export const figma = {
  setId: '133:1581',
  name: 'Buttom Status',
  props: { Status: 'children', 'Status error icons → Status': 'status (good | issue | error | retry)' },
  figmaGaps: {},
  notes: 'issue and retry both read status-pill/icon/warn — the Brand collection has good / warn / error icon colours only.',
} as const
