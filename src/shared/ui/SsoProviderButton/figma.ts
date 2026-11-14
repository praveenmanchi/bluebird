/** Logo layers figma/logos/<provider>.svg draws; the frame around them sets the size (SsoProviderButton.css). */
const artwork = (provider: string, parts: readonly string[], why: string) =>
  parts.map((part) => [`--bb-derived-sso-provider-button-${part}`, `${provider} logo ${why}`] as const)
const vector = (provider: string) => ['default', 'hover', 'focus'].map((state) => `vector-provider-${provider}-state-${state}`)
const sized = (layers: readonly string[]) => layers.flatMap((layer) => [`${layer}-width`, `${layer}-height`])
const filled = (layers: readonly string[]) => layers.map((layer) => `${layer}-fill`)

const DRAWN = 'artwork: its SVG in figma/logos draws this part and the Frame sizes the logo.'
const COLOUR = 'artwork colour: colours live in figma/logos/google.svg, not in tokens.'
const GOOGLE_PARTS = ['vector--1', 'vector--2', 'vector--3', ...vector('google')]

/** Figma ↔ code contract for SsoProviderButton ("SSO Provider Button" 40000324:8451). */
export const figma = {
  setId: '40000324:8451',
  name: 'SSO Provider Button',
  props: { Provider: 'provider (microsoft | okta | google)', State: ':hover / :focus-visible (state forces hover | focus)', Label: 'children (defaults to "Continue with <Provider>")' },
  figmaGaps: { 'dimension/opacity/99': 'Bound on two Google logo vectors; figma/logos/google.svg draws the opacity.' },
  derivedGaps: {
    ...Object.fromEntries([
      ...artwork('Microsoft', sized(vector('microsoft')), DRAWN),
      ...artwork('Okta', sized(vector('okta')), DRAWN),
      ...artwork('Google', sized(['group', ...GOOGLE_PARTS]), DRAWN),
      ...artwork('Google', filled(GOOGLE_PARTS), COLOUR),
    ]),
    '--bb-derived-sso-provider-button-root-width': 'The set frames are fixed at 344; instances fill the card, so code fills its container.',
  },
  notes: 'Logos are the Figma artwork in figma/logos (microsoft, okta, google), rendered through BrandLogo; re-export the SVGs when the artwork changes. Each logo keeps its Figma frame (18, 34, 32), which is why the mark-to-label gap differs by provider. Microsoft and Okta are single-colour marks (MONO_LOGOS) bound to login/provider/glyph in Figma and code, so they stay visible on the white buttons of Ikea, Richemont, AkzoNobel and Adecco. Google keeps its four colours as raw artwork.',
} as const
