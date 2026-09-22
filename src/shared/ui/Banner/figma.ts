/** Figma ↔ code contract for Banner. */
export const figma = {
  setId: '40000064:9910',
  name: 'Banner',
  props: {
    'Dual logo': 'dualLogo (rule + title/tagline stack)', 'HCL Logo': 'showPoweredBy', 'brand logos (variable-bound instance)': 'brand / [data-brand]' },
  figmaGaps: {},
  notes: [
    'Title and tagline fills are raw white in Figma; code uses Banner/Text. Bind them in Figma.',
    'Three fonts are raw (MuseoModerno, IBM Plex Sans, Michroma); they surface as --bb-derived-banner-*-font-family. type/family/museo already exists as a primitive.',
    'All spacing and the 632px frame width are raw; the unnamed frames (Frame 1430102689…) produce derived token names. Name the layers in Figma and re-pull.',
    'A sixth Brand mode named "Mode" appeared in the file (values copy Fiskars). It is ignored by the snapshot; delete it or name it.',
  ],
} as const
