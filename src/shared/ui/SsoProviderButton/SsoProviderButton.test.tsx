import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { SsoProviderButton } from './SsoProviderButton'

describe('SsoProviderButton', () => {
  it('labels each provider like Figma', () => {
    render(<><SsoProviderButton provider="microsoft" /><SsoProviderButton provider="okta" /><SsoProviderButton provider="google" /></>)
    for (const name of ['Microsoft', 'Okta', 'Google']) expect(screen.getByRole('button', { name: `Continue with ${name}` })).toBeInTheDocument()
  })
  it('draws the provider mark', () => {
    const { container } = render(<><SsoProviderButton provider="microsoft" /><SsoProviderButton provider="okta" /></>)
    expect(container.querySelectorAll('[data-provider="microsoft"] .bb-sso-provider__tile')).toHaveLength(4)
    expect(container.querySelector('[data-provider="okta"] .bb-sso-provider__ring')).not.toBeNull()
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
