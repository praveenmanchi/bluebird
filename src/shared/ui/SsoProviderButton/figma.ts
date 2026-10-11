const ring = 'The Okta "Ring" ellipse fills the 16px Glyph frame (login/icon/size-sm); code draws it as an SVG in that frame.'

/** Figma ↔ code contract for SsoProviderButton ("SSO Provider Button" 40000324:8451). */
export const figma = {
  setId: '40000324:8451',
  name: 'SSO Provider Button',
  props: { Provider: 'provider (microsoft | okta | google)', State: ':hover (state forces it)', Label: 'children (defaults to "Continue with <Provider>")' },
  figmaGaps: {},
  derivedGaps: {
    '--bb-derived-sso-provider-button-ring-width': ring,
    '--bb-derived-sso-provider-button-ring-height': ring,
    '--bb-derived-sso-provider-button-root-stroke-width': 'Stroke weight is raw 1; code draws it with input/border-width (1).',
    '--bb-derived-sso-provider-button-root-width': 'The set frames are fixed at 344; instances fill the card, so code fills its container.',
  },
  notes: 'Microsoft = four 7×7 tiles pushed to the corners of the 16px glyph; Okta = a ring with innerRadius 0.5; Google = a bold "G" in login/provider/text. These are monochrome stand-ins drawn in Figma, not the providers\' brand assets.',
} as const
