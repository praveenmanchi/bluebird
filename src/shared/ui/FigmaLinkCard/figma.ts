/** Figma ↔ code contract for FigmaLinkCard ("Figma Link Card" 40000268:8066). */
export const figma = {
  setId: '40000268:8066',
  name: 'Figma Link Card',
  props: {
    Frame: 'frame',
    Path: 'path',
    'Actions › Open in Figma (Tab Icons show)': 'onOpen',
    'Actions › Copy link (Tab Icons copy)': 'onCopy',
  },
  figmaGaps: {},
  notes: 'Created 2026-10-09 for the Jira ticket detail (remote links). Thumb glyph is Tab Icons "component"; the actions are Tab Icons "show" and "copy", each a real icon <button> with an accessible name. All three glyphs keep the Tab Icons colour (icon/glyph/default) at jira/size/icon; jira/icon/default exists but is not bound here. The Thumb reuses jira/size/avatar (24) for its size — there is no thumb size token.',
} as const
