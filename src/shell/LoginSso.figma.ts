import { scaleGaps } from '../shared/brand/scaleGaps'
const chrome = 'Page chrome, card and heading are shared with the Login Page and drawn once by LoginScreen.css (bb-login, bb-login__card, bb-login__heading).'
const badge = 'Bound on the "Private badge" Meta Badge instance; MetaBadge.css consumes it.'
const provider = 'Bound on the provider instances; the composed SsoProviderButton (SsoProviderButton.css) consumes it.'
const mock = 'The frame is a 1074×868 desktop mock; the plugin page fills the window and scrolls (LoginScreen.css).'
const fill = 'Instances fill the 342px card column; code fills its container.'

const chromeTokens = [
  'login/surface/page', 'login/page/padding', 'login/surface/card', 'login/border/card', 'login/card/radius', 'login/card/padding',
  'login/card/width', 'login/mark/bg', 'login/mark/radius', 'login/mark/size', 'login/icon/size', 'login/mark/icon',
  'login/font/title-size', 'login/font/title-weight', 'login/font/title-line', 'login/text/body',
  // Hint text + page footer: the shared .bb-login__hint / .bb-login__legal rules.
  'login/text/meta', 'login/font/caption-size', 'login/font/caption-line', 'login/font/weight-regular',
] as const

/** Figma ↔ code contract for the SSO card (frame "Login · SSO", not a component set). */
export const figma = {
  setId: '40000328:5494',
  name: 'Login · SSO',
  props: {
    'Heading › Title / Subtitle': 'fixed copy ("Sign in with SSO")',
    'Providers › Microsoft / Okta / Google provider': 'SsoProviderButton × 3 → onSso(provider, signal)',
    'Providers › Hint': 'fixed copy',
    'Login footer': 'LoginFooter view="sso" → back to the access-code card',
  },
  figmaGaps: {
    ...scaleGaps('border-width/default', 'input/border-width'),
    ...Object.fromEntries(chromeTokens.map((t) => [t, chrome])),
    'border/accent': badge, 'radius/pill': badge, 'space/inline-xs': badge, 'space/inline-sm': badge, 'space/inset-xs': badge,
    'login/provider/bg/default': provider, 'login/provider/border/default': provider, 'login/provider/radius': provider, 'login/provider/height': provider,
  },
  derivedGaps: {
    '--bb-derived-login-sso-root-width': mock, '--bb-derived-login-sso-root-height': mock,
    '--bb-derived-login-sso-brand-logos-width': `${chrome} Same 126×37.2 as --bb-derived-login-screen-brand-logos-*.`,
    '--bb-derived-login-sso-brand-logos-height': `${chrome} Same 126×37.2 as --bb-derived-login-screen-brand-logos-*.`,
    '--bb-derived-login-sso-private-badge-width': 'Hug size of the Meta Badge instance.',
    '--bb-derived-login-sso-private-badge-height': 'Hug size of the Meta Badge instance.',
    '--bb-derived-login-sso-microsoft-provider-width': fill, '--bb-derived-login-sso-okta-provider-width': fill, '--bb-derived-login-sso-google-provider-width': fill,
    '--bb-derived-login-sso-login-footer-width': fill, '--bb-derived-login-sso-login-footer-height': fill,
  },
  codeOnly: {
    states: '"Login · SSO redirecting" (40000328:5564): Waiting = Spinner (Accent, size-lg) · "Waiting for <provider>…" · hint · Cancel. "Login · SSO not approved" (40000328:5615): Notice Error above the providers. Any other failure reuses Notice Error with the handler\'s message.',
  },
  notes: 'SSO needs an identity provider and a callback the plugin can poll; the shell wires onSso to a handler that explains SSO is not configured until that exists. Throw SsoNotApprovedError for the not-approved state.',
} as const
