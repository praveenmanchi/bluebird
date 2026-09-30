/** Figma ↔ code contract for DisabilityIndicator. */
export const figma = {
  setId: '419:40527',
  name: 'Disability Indicator',
  props: { 'Property 1': 'kind (auditory | code | cognitive | content | design | physical | visual)' },
  figmaGaps: {
    'dimension/size/icon-24': 'Auditory / Visual / Design bind the glyph box to the raw 24px primitive; code reads disability-indicator/icon/size, the semantic token that Cognitive / Physical / Content bind. Rebind in Figma to close the gap.',
    'Graphic sizes/--card-indicator-icon-size': 'The Code variant\'s glyph (40000121:7346) binds its 20px box to a "Graphic sizes" collection that is not among the pulled Foundations / Semantics / Brand UI collections, so no --bb-graphic-sizes-card-indicator-icon-size is generated and the CSS cannot read it (tokens:check would flag an unknown token). The code keeps that glyph on disability-indicator/icon/size like the other six kinds, so it renders at the brand icon size (24 / 18px) where Figma draws 20px. Rebind the glyph to disability-indicator/icon/size in Figma, or add the variable to a pulled collection, to close the gap.',
    'icon/glyph/default': 'Every variant binds the tile fill to the generic glyph colour, which would hide the coloured glyph on a dark tile. Code paints the tile with disability-indicator/bg/default and the glyph with disability-indicator/icon/color, both present in the Brand collection for this tile. Rebind the frame fill in Figma to close the gap.',
  },
  notes: 'All seven kinds are a FIXED 30×30 tile holding one centred glyph instance. Code holds the tile at 30×30 in every brand with an inset floor ((tile − glyph) / 2) plus a max size rather than width/height, so an instance a consumer re-insets hugs glyph + inset instead of inheriting 30px. WcagCard\'s footer checks are FIXED 21.1px in Figma but only re-inset here, so they render at ~28.5px (24px glyph) — an open gap in WcagCard, not in this atom. The glyphs are the disability-<kind> set from Icon.',
} as const
