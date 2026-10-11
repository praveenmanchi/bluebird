import type { JSX } from 'preact'
import { Button } from '../Button/Button'
import { DividerLabel } from '../DividerLabel/DividerLabel'
import { ContactRow, type ContactRowProps } from '../ContactRow/ContactRow'
import './LoginFooter.css'

export type LoginFooterView = 'access-code' | 'sso'

export interface LoginFooterProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Figma "View": the screen this footer sits on. It offers the *other* sign-in method. */
  view?: LoginFooterView
  /** The switch button (Sign in with SSO / Use an access code instead). */
  onSwitch?: () => void
  /** Disable the switch while a sign-in is in flight. */
  switchDisabled?: boolean
  /** Passed to the nested Contact Row. */
  contact?: Omit<ContactRowProps, 'class'>
}

const COPY = {
  'access-code': { divider: 'Other ways to sign in', action: 'Sign in with SSO', icon: 'access' },
  sso: { divider: 'Can’t use SSO?', action: 'Use an access code instead', icon: 'api-key' },
} as const

/** Figma "Login Footer" (40000324:8504): the alternative sign-in method plus who to contact. */
export function LoginFooter({ view = 'access-code', onSwitch, switchDisabled = false, contact, class: cls, ...rest }: LoginFooterProps) {
  const copy = COPY[view]
  return (
    <div {...rest} class={`bb-login-footer ${cls ?? ''}`}>
      <DividerLabel>{copy.divider}</DividerLabel>
      <Button variant="secondary" size="lg" leadingIcon={copy.icon} class="bb-login-footer__switch" onClick={onSwitch} disabled={switchDisabled}>
        {copy.action}
      </Button>
      <ContactRow {...contact} />
    </div>
  )
}
