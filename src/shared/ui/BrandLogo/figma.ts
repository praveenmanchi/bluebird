/** Figma ↔ code contract for the "brand logos" set. */
export const figma = {
  setId: '40000064:9865',
  name: 'brand logos',
  props: { Brand: 'brand (or the nearest surrounding data-brand, mirroring the `brand logos` variable binding)' },
  figmaGaps: {},
  derivedGaps: {
    '--bb-derived-brand-logo-vector-brand-fiskars-fill': 'Logo artwork colour (Fiskars wordmark, #de8a2e since 2026-09-23). Colours live in figma/logos/fiskars.svg, not in tokens; re-export the SVG when the artwork changes.',
    '--bb-derived-brand-logo-vector-brand-ikea-width': 'Both Brand=ikea vectors are named "Vector" and the plain name keeps the later one: this is the 82.1 wordmark, drawn by ikea.svg. The ikea box reads the 106.3 oval as vector--1 (notes).',
    '--bb-derived-brand-logo-vector-brand-ikea-height': 'Same as the width: 14.6 is the wordmark, drawn by ikea.svg. The ikea box reads the 35 oval as vector--1 (notes).',
    '--bb-derived-brand-logo-vector--1-brand-ikea-fill': 'Logo artwork colour (the IKEA yellow oval). Colours live in figma/logos/ikea.svg, not in tokens.',
    '--bb-derived-brand-logo-vector--1-brand-richemont-fill': 'Logo artwork colour (Richemont has three vectors named "Vector"; this is the first). Colours live in figma/logos/richemont.svg, not in tokens.',
    '--bb-derived-brand-logo-vector--1-brand-richemont-width': 'Richemont artwork part (first of three "Vector" layers); richemont.svg draws it and the fixed root frame sizes the logo.',
    '--bb-derived-brand-logo-vector--1-brand-richemont-height': 'Richemont artwork part (first of three "Vector" layers); richemont.svg draws it and the fixed root frame sizes the logo.',
    '--bb-derived-brand-logo-vector--2-brand-richemont-fill': 'Logo artwork colour (the second of Richemont\'s three "Vector" layers). Colours live in figma/logos/richemont.svg.',
    '--bb-derived-brand-logo-group-brand-richemont-width': 'Richemont artwork group; richemont.svg draws it and the fixed root frame sizes the logo.',
    '--bb-derived-brand-logo-group-brand-richemont-height': 'Richemont artwork group; richemont.svg draws it and the fixed root frame sizes the logo.',
    '--bb-derived-brand-logo-frame-brand-hcl-width': 'The HCL glyph frame inside hcltech.svg; the fixed 103x30 root frame sizes the mark.',
    '--bb-derived-brand-logo-frame-brand-hcl-height': 'The HCL glyph frame inside hcltech.svg; the fixed 103x30 root frame sizes the mark.',
    '--bb-derived-brand-logo-group-brand-akzonobel-width': 'AkzoNobel wordmark group inside akzonobel.svg; the box is its Frame plus root padding.',
    '--bb-derived-brand-logo-group-brand-akzonobel-height': 'AkzoNobel wordmark group inside akzonobel.svg; the box is its Frame plus root padding.',
    '--bb-derived-brand-logo-vector-brand-akzonobel-width': 'AkzoNobel wordmark vector inside akzonobel.svg; the box is its Frame plus root padding.',
    '--bb-derived-brand-logo-vector-brand-akzonobel-height': 'AkzoNobel wordmark vector inside akzonobel.svg; the box is its Frame plus root padding.',
    '--bb-derived-brand-logo-vector-brand-akzonobel-fill': 'Logo artwork colour (AkzoNobel blue #005596). Colours live in figma/logos/akzonobel.svg, not in tokens.',
    ...Object.fromEntries([
      'vector-brand-adecco-width', 'vector-brand-adecco-height', 'vector-brand-adecco-fill',
      'vector--1-brand-adecco-width', 'vector--1-brand-adecco-height', 'vector--2-brand-adecco-fill',
    ].map((t) => [`--bb-derived-brand-logo-${t}`, 'Adecco artwork part (red box / white wordmark, both named "Vector"); adecco.svg draws it and the box is its Frame plus root padding.'])),
    '--bb-derived-brand-logo-vector--2-width': 'Richemont artwork part (second of three "Vector" layers); richemont.svg draws it and the fixed root frame sizes the logo.',
    '--bb-derived-brand-logo-vector--2-height': 'Richemont artwork part (second of three "Vector" layers); richemont.svg draws it and the fixed root frame sizes the logo.',
    '--bb-derived-brand-logo-vector--1-brand-fiskars-fill': 'Logo artwork colour (the black 140.4x29.6 box behind the Fiskars wordmark; both are named "Vector"). Colours live in figma/logos/fiskars.svg.',
    '--bb-derived-brand-logo-vector--1-brand-fiskars-width': 'The 140.4x29.6 artwork box inside fiskars.svg; the fixed 140x30 root frame sizes the logo (notes).',
    '--bb-derived-brand-logo-vector--1-brand-fiskars-height': 'The 140.4x29.6 artwork box inside fiskars.svg; the fixed 140x30 root frame sizes the logo (notes).',
  },
  notes: 'Logo artwork keeps its own colours (the HCL variant is monochrome and follows Banner/Text). The Bridge variant is outlined text (~49 KB); a simplified asset would shrink the plugin bundle. ' +
    'Brand=ikea (40000064:9864) hugs its 106.3x35 oval with no padding. BrandLogo gives each svg its exported viewBox as width/height and BrandLogo.css overrides that for every variant; ikea reads the oval as vector--1. ' +
    'Figma pads SVG exports to whole pixels (ikea.svg is 0 0 107 35 around the 106.281x35 artwork, bridge 163 for 162.7), so in the 106.3 box the ikea artwork scales ~0.7% to fit. ' +
    'Brand=fiskars (40000064:9860) keeps its fixed 140x30 frame: fiskars.svg (0 0 141 30, re-exported 2026-09-26) puts the 140.4x29.6 box at the origin, so it fills the frame at 99% like bridge instead of letterboxing. ' +
    'Brand=akzonobel (40002394:43169) and Brand=adecco (40002394:43179), both added 2026-10-27, hug their artwork Frame (159.6x23.3 / 109x59.3) with 3px padding; BrandLogo.css adds the per-brand padding tokens to the frame size. ' +
    'Since 2026-09-27 the generator gives same-named layers position-indexed tokens (vector--1) instead of dropping all but the last. Those names follow layer order, so distinct names in Figma (e.g. "Oval" / "Wordmark") would make the ikea sizing robust to a reorder.',
} as const
