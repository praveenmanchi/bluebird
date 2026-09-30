/** Figma ↔ code contract for TeamBanner. */
export const figma = {
  setId: '204:7270',
  name: 'team Banner',
  props: {
    'Built with Care by the Gap Design System Team (text)': 'team',
    'Version 1.3.3 (text)': 'version',
    'Fabric Logo  (instance) + Line 60': 'showFabric',
    'Together, every step forward to Innovate’ & scale (text)': 'tagline | children',
  },
  figmaGaps: {},
  derivedGaps: {
    '--bb-derived-team-banner-vector--1-width': 'The Bridge wordmark vector inside the "SVG" frame (204:7252; it shares the name "Vector" with the version-pill chevron). BrandLogo draws figma/logos/bridge.svg sized by the SVG frame tokens (notes).',
    '--bb-derived-team-banner-vector--1-height': 'The Bridge wordmark vector inside the "SVG" frame (204:7252; it shares the name "Vector" with the version-pill chevron). BrandLogo draws figma/logos/bridge.svg sized by the SVG frame tokens (notes).',
  },
  notes: [
    'The set has no component properties; every text is a plain layer, so the code props mirror the layers.',
    'The team mark ("SVG/Vector", bound to icon/glyph/default) is the same artwork as figma/logos/bridge.svg → rendered with BrandLogo so it follows the active brand, sized by the derived SVG frame tokens.',
    'The Fabric Logo instance has no size token; it is drawn at dimension/size/control-32 (its Figma height, 31.2, rounds to the control height).',
    '"Rectangle 3475073" (1×162, no fill) is an invisible spacer in Figma and is not rendered.',
    'Frame 1430102657 (tagline + credit) has no item spacing and both children FILL it, so they split the 576 row into 288 each — flex: 1 on both, no width token. At 288 the default tagline wraps to 3 lines (51 = 3×17), as in Figma; the root is 123 against Figma\'s 122.2 only because the Fabric row is drawn at 32 (note above).',
    'The default tagline is text node 204:7255 verbatim, "Together, every\\nstep forward to Innovate’ & scale". The ’ after "Innovate" looks like a typo in the design file; code keeps it so the copy matches — designer to fix the Figma text.',
  ],
} as const
