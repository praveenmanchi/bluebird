import { scaleGaps } from '../shared/brand/scaleGaps'
const composed = (what: string) => `Bound on the nested ${what} instance; the composed component consumes it.`
const badge = composed('"Private badge" Meta Badge (MetaBadge.css)')
const button = composed('"Submit button" Button (Button.css)')
const notice = composed('Notice (Notice.css)')
const fill = 'Instances fill the 342px card column (hug height); code fills its container.'

/** Figma ↔ code contract for the Login screen (frame, not a component set). */
export const figma = {
  setId: '40000308:21144',
  name: 'Login Page',
  props: {
    'Heading › Title': 'title',
    'Form › Access code field': 'AccessCodeField (value, status, helper from the sandbox message)',
    'Form › Submit button': 'Button primary/lg: "Sign in" (disabled while empty) → "Checking code…" → "Opening Design studio…" / "Try again"',
    'Login footer': 'LoginFooter view="access-code" → switches to the SSO card (LoginSso)',
  },
  figmaGaps: {
    ...scaleGaps('border-width/default', 'button/primary/border-width', 'dimension/opacity/55'),
    'border/accent': badge, 'radius/pill': badge, 'space/inline-xs': badge, 'space/inline-sm': badge, 'space/inset-xs': badge,
    'login/notice/radius': notice, 'login/notice/padding': notice, 'login/gap/sm': notice,
    'login/gap/xs': composed('Access code field (AccessCodeField.css)'),
    'button/primary/bg/disabled': button, 'button/primary/border/disabled': button, 'button/primary/radius': button,
    'button/primary/padding-x-lg': button, 'button/primary/height-lg': button,
  },
  derivedGaps: {
    '--bb-derived-login-screen-root-width': 'The frame is a 1074×868 desktop mock; the plugin window is 360–760 wide, so the page fills the window and scrolls.',
    '--bb-derived-login-screen-root-height': 'The frame is a 1074×868 desktop mock; the plugin window is 360–760 wide, so the page fills the window and scrolls.',
    '--bb-derived-login-screen-private-badge-width': 'Hug size of the Meta Badge instance.',
    '--bb-derived-login-screen-private-badge-height': 'Hug size of the Meta Badge instance.',
    '--bb-derived-login-screen-notice-width': fill, '--bb-derived-login-screen-notice-height': fill,
    '--bb-derived-login-screen-access-code-field-width': fill, '--bb-derived-login-screen-access-code-field-height': fill,
    '--bb-derived-login-screen-login-footer-width': fill, '--bb-derived-login-screen-login-footer-height': fill,
    '--bb-derived-login-screen-submit-button-width': fill,
  },
  codeOnly: {
    states: 'The card walks the Access code flow frames: Login Page (empty) · Typing (40000326:5336) · Submitting (40000326:5403) · Error (40000326:5469) · Success (40000326:5536).',
    busyButton: 'While checking / opening, the submit button stays primary (not the Disabled variant) with the Spinner (On accent) — aria-disabled guards double submits.',
  },
  notes: 'Figma\'s Typing/Submitting/Error/Success frames title the Notice "Private plugin" while the Login Page says "Private plugin · HCLTech only"; code follows the Login Page. The Error helper "4 attempts left" is placeholder — the sandbox has no attempt limit, so its message is shown instead. The Success frame\'s two footer texts overlap in Figma (Reminder at x 0); code keeps them apart.',
} as const
