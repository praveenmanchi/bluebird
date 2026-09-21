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
  notes: [
    'The set has no component properties; every text is a plain layer, so the code props mirror the layers.',
    'The team mark ("SVG/Vector", bound to icon/glyph/default) is the same artwork as figma/logos/bridge.svg → rendered with BrandLogo so it follows the active brand, sized by the derived SVG frame tokens.',
    'The Fabric Logo instance has no size token; it is drawn at dimension/size/control-32 (its Figma height, 31.2, rounds to the control height).',
    '"Rectangle 3475073" (1×162, no fill) is an invisible spacer in Figma and is not rendered.',
  ],
} as const
