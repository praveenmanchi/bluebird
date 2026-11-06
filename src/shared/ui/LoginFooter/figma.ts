import { scaleGaps } from '../../brand/scaleGaps'
const button = 'Bound on the nested Secondary / Large Button instance; the composed <Button> (Button.css) consumes it.'

/** Figma ↔ code contract for LoginFooter ("Login Footer" 40000324:8504). */
export const figma = {
  setId: '40000324:8504',
  name: 'Login Footer',
  props: {
    View: 'view (access-code | sso)',
    'SSO button / Access code button': 'onSwitch (+ switchDisabled)',
    'Divider Label › Label': 'fixed per view ("Other ways to sign in" / "Can’t use SSO?")',
    'Contact Row': 'contact',
  },
  figmaGaps: {
    ...scaleGaps('button/secondary/border-width'),
    'button/secondary/bg/default': button,
    'button/secondary/border/default': button,
    'button/secondary/radius': button,
    'button/secondary/gap': button,
    'button/secondary/padding-x-lg': button,
    'button/secondary/height-lg': button,
    'login/gap/md': 'Bound on the nested Divider Label instance; DividerLabel.css consumes it.',
    'login/gap/sm': 'Bound on the nested Contact Row instance; ContactRow.css consumes it.',
  },
  derivedGaps: {
    '--bb-derived-login-footer-root-width': 'The set frames are fixed at 344; instances fill the card, so code fills its container.',
  },
  notes: 'The switch button\'s leading icon is overridden per view: "access" (lock) for SSO, "API key" for the access code.',
} as const
