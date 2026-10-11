import type { ComponentChildren, JSX } from 'preact'
import './SsoProviderButton.css'

export type SsoProvider = 'microsoft' | 'okta' | 'google'

export interface SsoProviderButtonProps extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  /** Figma "Provider". */
  provider?: SsoProvider
  /** Force the Figma "State" look (stories). Real hover comes from :hover. */
  state?: 'default' | 'hover'
  /** Label; defaults to "Continue with <provider>". */
  children?: ComponentChildren
}

export const SSO_PROVIDER_LABEL: Record<SsoProvider, string> = { microsoft: 'Microsoft', okta: 'Okta', google: 'Google' }

/** Figma "SSO Provider Button" (40000324:8451): one identity provider on the SSO screen, with its monochrome mark. */
export function SsoProviderButton({ provider = 'microsoft', state, children, class: cls, ...rest }: SsoProviderButtonProps) {
  return (
    <button {...rest} type="button" class={`bb-sso-provider ${cls ?? ''}`} data-provider={provider} data-state={state}>
      <span class="bb-sso-provider__glyph" aria-hidden="true"><Glyph provider={provider} /></span>
      <span class="bb-sso-provider__label">{children ?? `Continue with ${SSO_PROVIDER_LABEL[provider]}`}</span>
    </button>
  )
}

function Glyph({ provider }: { provider: SsoProvider }) {
  if (provider === 'microsoft') return <>{[0, 1, 2, 3].map((i) => <span key={i} class="bb-sso-provider__tile" />)}</>
  // Okta "Ring": a 16-unit ellipse with innerRadius 0.5 (outer r 8, inner r 4).
  if (provider === 'okta') return <svg class="bb-sso-provider__ring" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke-width="4" /></svg>
  return <span class="bb-sso-provider__letter">G</span>
}
