import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { render, screen, fireEvent } from '@testing-library/preact'
import { SsoProviderButton, type SsoProvider } from './SsoProviderButton'

// Vitest blanks CSS imports, so the stylesheet is read from disk.
const css = readFileSync(fileURLToPath(import.meta.url).replace(/\.test\.tsx$/, '.css'), 'utf8')

function logoOf(provider: SsoProvider): SVGSVGElement {
  const { container } = render(<SsoProviderButton provider={provider} />)
  const logo = container.querySelector<SVGSVGElement>(`[data-provider="${provider}"] svg[data-logo="${provider}"]`)
  if (!logo) throw new Error(`no ${provider} logo`)
  return logo
}
const fills = (logo: SVGSVGElement) => [...logo.querySelectorAll('path')].map((path) => path.getAttribute('fill'))

describe('SsoProviderButton', () => {
  it('labels each provider like Figma', () => {
    render(<><SsoProviderButton provider="microsoft" /><SsoProviderButton provider="okta" /><SsoProviderButton provider="google" /></>)
    for (const name of ['Microsoft', 'Okta', 'Google']) expect(screen.getByRole('button', { name: `Continue with ${name}` })).toBeInTheDocument()
  })
  it.each([['microsoft', 18], ['okta', 34], ['google', 32]] as const)('draws the %s logo in its %dpx Figma frame', (provider, frame) => {
    expect(logoOf(provider).getAttribute('viewBox')).toBe(`0 0 ${frame} ${frame}`)
  })
  it('keeps the logo out of the button name', () => {
    expect(logoOf('okta')).toHaveAttribute('aria-hidden', 'true')
  })
  // Both marks are bound to login/provider/glyph: a fixed white would vanish on the white buttons
  // of light brands such as Ikea or IBM.
  it.each(['microsoft', 'okta'] as const)('draws the %s mark in the glyph colour', (provider) => {
    expect(new Set(fills(logoOf(provider)))).toEqual(new Set(['currentColor']))
    expect(css).toMatch(/\.bb-sso-provider__logo \{[^}]*color: var\(--bb-login-provider-glyph\)/)
  })
  it('keeps the four Google colours as artwork', () => {
    expect(fills(logoOf('google'))).toEqual(['#F44336', '#FFC107', '#448AFF', '#43A047'])
  })
  it.each(['microsoft', 'okta', 'google'])('sizes the %s logo from its Figma frame in both states', (provider) => {
    const button = `.bb-sso-provider[data-provider='${provider}']`
    const rules = { default: `${button} .bb-sso-provider__logo {`, hover: `${button}[data-state='hover'] .bb-sso-provider__logo {` }
    for (const [state, selector] of Object.entries(rules)) {
      const rule = css.split('}').find((candidate) => candidate.includes(selector))
      for (const side of ['width', 'height']) {
        const token = `--bb-derived-sso-provider-button-frame-provider-${provider}-state-${state}-${side}`
        expect(rule).toContain(`${side}: var(${token})`)
      }
    }
  })
  it('exposes a forced focus state and draws it with border/focus', () => {
    render(<SsoProviderButton provider="okta" state="focus" />)
    expect(screen.getByRole('button')).toHaveAttribute('data-state', 'focus')
    expect(css).toMatch(/\.bb-sso-provider:is\(:focus-visible, \[data-state='focus'\]\) \{[^}]*solid var\(--bb-border-focus\)/)
  })
  it('is a plain button that reports clicks', () => {
    const onClick = vi.fn()
    render(<SsoProviderButton provider="google" onClick={onClick} />)
    const button = screen.getByRole('button', { name: 'Continue with Google' })
    expect(button).toHaveAttribute('type', 'button')
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
