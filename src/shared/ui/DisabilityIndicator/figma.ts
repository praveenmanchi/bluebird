/** Figma ↔ code contract for DisabilityIndicator. */
export const figma = {
  setId: '419:40527',
  name: 'Disability Indicator',
  props: { 'Property 1': 'kind (auditory | code | cognitive | content | design | physical | visual)' },
  figmaGaps: {
    'icon/glyph/default': 'Three variants (Cognitive / Physical / Content) bind the tile fill to the generic glyph colour, which would hide the coloured glyph on a dark tile. Code paints the tile with disability-indicator/bg/default and the glyph with disability-indicator/icon/color, both present in the Brand collection for this tile. Rebind the frame fill in Figma to close the gap.',
  },
  notes: 'Figma mixes two constructions (a 29px tile with a bare icon vs a 15.4px nested "Disabilities"/"Responsibilities" instance). Code uses the tile construction for all seven kinds and the disability-<kind> glyphs from the Icon set.',
} as const
