import type { ComponentChildren, JSX } from 'preact'
import { BrandLogo } from '../BrandLogo/BrandLogo'
import './SsoProviderButton.css'

export type SsoProvider = 'microsoft' | 'okta' | 'google'

export interface SsoProviderButtonProps extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  /** Figma "Provider". */
  provider?: SsoProvider
  /** Force the Figma "State" look, Hover or Focus (stories). Real hover comes from :hover, real focus from :focus-visible. */
  state?: 'default' | 'hover' | 'focus'
  /** Label; defaults to "Continue with <provider>". */
  children?: ComponentChildren
}

export const SSO_PROVIDER_LABEL: Record<SsoProvider, string> = { microsoft: 'Microsoft', okta: 'Okta', google: 'Google' }

/** Figma "SSO Provider Button" (40000324:8451): one identity provider on the SSO screen, with its logo. */
export function SsoProviderButton({ provider = 'microsoft', state, children, class: cls, ...rest }: SsoProviderButtonProps) {
  return (
    <button {...rest} type="button" class={`bb-sso-provider ${cls ?? ''}`} data-provider={provider} data-state={state}>
      <BrandLogo logo={provider} class="bb-sso-provider__logo" />
      <span class="bb-sso-provider__label">{children ?? `Continue with ${SSO_PROVIDER_LABEL[provider]}`}</span>
    </button>
  )
}
