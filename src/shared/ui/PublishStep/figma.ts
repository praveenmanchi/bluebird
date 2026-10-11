/** Figma ↔ code contract for PublishStep ("Publish Step" 40000341:8605). */
export const figma = {
  setId: '40000341:8605',
  name: 'Publish Step',
  props: {
    Title: 'title',
    Detail: 'detail',
    Time: 'time',
    Status: 'status (Done / Running / Queued / Failed)',
    'Indicator (Status error icons / Spinner / Queued ring)': 'status → Icon status-good / Spinner accent / ring / Icon status-error',
  },
  figmaGaps: {},
  derivedGaps: {
    '--bb-derived-publish-step-root-width': 'FIXED 600 in Figma (a wide sample); in code the step fills its parent column and the Text frame (FILL) absorbs the width.',
  },
  notes: 'Created 2026-10-11 for the Publish tab. The Indicator holds a nested "Status error icons" instance (Done → Good, Failed → error) coloured with the connection/icon/* tokens that set binds, a Tone=Accent Spinner in Running (login/spinner/size) or, in Queued, a 12 × 12 ellipse stroked publish/step/queued-border with no fill. Queued mutes the Title to publish/text/meta and Failed paints the Detail publish/diff/removed, as Figma does. Every indicator has an accessible name (glyph title, spinner label, ring aria-label) and Running sets aria-busy. The publish/step/done · running · failed · glyph · rail tokens are not bound on this set (they belong to the step rail elsewhere in the tab), so the glyph colours follow the icon set. Stack steps in a list (<li>) where they form a run.',
} as const
