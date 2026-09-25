/** Figma ↔ code contract for Banner. */
export const figma = {
  setId: '40000064:9910',
  name: 'Banner',
  props: {
    'Dual logo': 'dualLogo (rule + title/tagline stack)', 'HCL Logo': 'showPoweredBy', 'brand logos (variable-bound instance)': 'brand / [data-brand]' },
  figmaGaps: {},
  derivedGaps: {
    '--bb-derived-banner-vector-fill': 'Raw white fill on the brand-logo vector nested in the Banner; logo artwork is not tokenised (see BrandLogo).',
    '--bb-derived-banner-frame-1430102691-gap': 'A -2px negative gap on an unnamed frame; code lays the logo row out with its own flex gap.',
  },
  notes: [
    'Title and tagline fills are raw white in Figma; code uses Banner/Text. Bind them in Figma.',
    '"Powered By" is raw white (unbound 2026-09-24) and code reads that value: Banner/powered by is transparent (#ffffff00) in every Brand mode but Bridge, so binding the label to it hid "Powered By" in four brands. Line 62 (the rule beside the brand logo) is still bound to it, so the rule shows in Bridge only — in Figma and in code.',
    'Three fonts are raw (MuseoModerno, IBM Plex Sans, Michroma); they surface as --bb-derived-banner-*-font-family. type/family/museo already exists as a primitive.',
    'All spacing and the 632px frame width are raw; the unnamed frames (Frame 1430102689…) produce derived token names. Name the layers in Figma and re-pull.',
    'A sixth Brand mode named "Mode" appeared in the file (values copy Fiskars). It is ignored by the snapshot; delete it or name it.',
  ],
} as const
