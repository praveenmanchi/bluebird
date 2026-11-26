/** Figma ↔ code contract for the "brand logos" set. */
export const figma = {
  setId: '40000064:9865',
  name: 'brand logos',
  props: { Brand: 'brand (or the nearest surrounding data-brand, mirroring the `brand logos` variable binding)' },
  figmaGaps: {
    'opacity/100': 'Bound on the Bridge wordmark vector to a variable outside this file; artwork opacity, figma/logos/brand-bridge.svg draws it.',
    'color/white/solid': 'Bound on the Bridge wordmark vector to a variable outside this file\'s collections. Artwork colour: figma/logos/brand-bridge.svg draws it.',
  },
  derivedGaps: {
    '--bb-derived-brand-logo-vector-1-fill': 'Logo artwork colour (the IKEA yellow oval). Colours live in figma/logos/brand-ikea.svg, not in tokens.',
    '--bb-derived-brand-logo-vector-2-fill': 'Logo artwork colour (the IKEA blue wordmark). Colours live in figma/logos/brand-ikea.svg, not in tokens.',
    '--bb-derived-brand-logo-vector-2-width': 'The 82.1 IKEA wordmark inside brand-ikea.svg; the ikea box reads the 106.3x35 oval (vector-1).',
    '--bb-derived-brand-logo-vector-2-height': 'The 14.6 IKEA wordmark inside brand-ikea.svg; the ikea box reads the 106.3x35 oval (vector-1).',
    '--bb-derived-brand-logo-frame-brand-hcl-width': 'The HCL glyph frame inside hcltech.svg; the fixed 103x30 root frame sizes the mark.',
    '--bb-derived-brand-logo-frame-brand-hcl-height': 'The HCL glyph frame inside hcltech.svg; the fixed 103x30 root frame sizes the mark.',
    '--bb-derived-brand-logo-vector-brand-gap-width': 'Gap Inc. stacked wordmark inside brand-gap.svg; the box is its Frame plus root padding.',
    '--bb-derived-brand-logo-vector-brand-gap-height': 'Gap Inc. stacked wordmark inside brand-gap.svg; the box is its Frame plus root padding.',
  },
  notes: 'Logo artwork keeps its own colours (the HCL variant is monochrome and follows Banner/Text). The Bridge variant is outlined text (~49 KB); a simplified asset would shrink the plugin bundle. ' +
    'figma/components.json carries only the Bridge, Ikea, Gap and HCL variants (their frames size the logo through derived tokens). All brand artwork is figma/logos/brand-<id>.svg (bare names are non-brand marks such as github or microsoft); the 37 client logos added 2026-11-25 are exports of their variants, sized by their own viewBox, so their artwork geometry never becomes tokens. ' +
    'Brand=ikea (40000064:9864) hugs its 106.3x35 oval with no padding; BrandLogo.css reads the oval as vector-1. ' +
    'Figma pads SVG exports to whole pixels (brand-ikea.svg is 0 0 107 35 around the 106.281x35 artwork, bridge 163 for 162.7), so in the 106.3 box the ikea artwork scales ~0.7% to fit. ' +
    'Brand=gap (40002444:66792) is the stacked GAP INC. mark in a 33.4x30 Frame with 6px padding (component 45.4x42), reversed white for the blue banner; with only one padded variant left, its padding tokens are root-padding-*. ' +
    'Richemont, Disney, Fiskars, AkzoNobel and Adecco were removed from the Figma file and from code on 2026-11-26.',
} as const
