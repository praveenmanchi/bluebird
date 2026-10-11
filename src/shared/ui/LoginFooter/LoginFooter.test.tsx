import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { LoginFooter } from './LoginFooter'

describe('LoginFooter', () => {
  it('offers SSO from the access-code screen', () => {
    const onSwitch = vi.fn()
    render(<LoginFooter onSwitch={onSwitch} />)
    expect(screen.getByRole('separator')).toHaveTextContent('Other ways to sign in')
    fireEvent.click(screen.getByRole('button', { name: 'Sign in with SSO' }))
    expect(onSwitch).toHaveBeenCalledTimes(1)
  })
  it('offers the access code from the SSO screen', () => {
    render(<LoginFooter view="sso" />)
    expect(screen.getByRole('separator')).toHaveTextContent('Can’t use SSO?')
    expect(screen.getByRole('button', { name: 'Use an access code instead' })).toBeInTheDocument()
  })
  it('can lock the switch and forwards contact details', () => {
    render(<LoginFooter switchDisabled contact={{ email: 'ds@example.com' }} />)
    expect(screen.getByRole('button', { name: 'Sign in with SSO' })).toBeDisabled()
    expect(screen.getByRole('link', { name: 'ds@example.com' })).toBeInTheDocument()
  })
})
