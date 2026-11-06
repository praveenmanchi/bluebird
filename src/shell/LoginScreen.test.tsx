import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/preact'
import { LoginScreen } from './LoginScreen'
import { SsoNotApprovedError, type SsoHandler } from './LoginSso'

const pending = () => new Promise<void>(() => undefined)
const noSso: SsoHandler = async () => { throw new Error('unused') }

function type(code: string) {
  fireEvent.input(screen.getByLabelText('Access code'), { target: { value: code } })
}

describe('LoginScreen · access code', () => {
  it('renders the Login Page chrome and keeps Sign in disabled until a code is typed', () => {
    render(<LoginScreen onSubmit={vi.fn()} onSso={noSso} />)
    expect(screen.getByRole('heading', { name: 'Design Studio' })).toBeInTheDocument()
    expect(screen.getByText('Private plugin')).toBeInTheDocument()
    expect(screen.getByText('Never share your access code outside your team')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled()
    type('IKEA-2026')
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled()
  })

  it('checks the code, then shows the accepted state', async () => {
    let accept: () => void = () => undefined
    const onSubmit = vi.fn((_code: string, accepted: () => void) => { accept = accepted; return pending() })
    render(<LoginScreen onSubmit={onSubmit} onSso={noSso} />)
    type('IKEA-2026')
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(onSubmit).toHaveBeenCalledWith('IKEA-2026', expect.any(Function))
    expect(await screen.findByText('Checking your code…')).toBeInTheDocument()
    expect(screen.getByLabelText('Access code')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Checking code…' })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('button', { name: 'Sign in with SSO' })).toBeDisabled()
    accept()
    expect(await screen.findByText('Code accepted. Opening Design Studio…')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Opening Design Studio…' })).toBeInTheDocument()
  })

  it('ignores a second submit while checking', async () => {
    const onSubmit = vi.fn(pending)
    render(<LoginScreen onSubmit={onSubmit} onSso={noSso} />)
    type('IKEA-2026')
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Checking code…' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('shows the error, offers Try again, and clears it on edit', async () => {
    render(<LoginScreen onSubmit={async () => { throw new Error('That access code is not recognised.') }} onSso={noSso} />)
    type('WRONG')
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('That access code is not recognised.')).toBeInTheDocument()
    expect(screen.getByLabelText('Access code')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled()
    type('WRONG-2')
    expect(screen.queryByText('That access code is not recognised.')).toBeNull()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })
})

describe('LoginScreen · SSO', () => {
  it('switches to SSO, waits for the provider and cancels back', async () => {
    let signal: AbortSignal | undefined
    const onSso = vi.fn<SsoHandler>((_p, s) => { signal = s; return pending() })
    render(<LoginScreen onSubmit={vi.fn()} onSso={onSso} />)
    fireEvent.click(screen.getByRole('button', { name: 'Sign in with SSO' }))
    expect(screen.getByRole('heading', { name: 'Sign in with SSO' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Microsoft' }))
    expect(onSso).toHaveBeenCalledWith('microsoft', expect.any(AbortSignal))
    expect(await screen.findByRole('status')).toHaveTextContent('Waiting for Microsoft…')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(signal?.aborted).toBe(true)
    expect(screen.getByRole('button', { name: 'Continue with Microsoft' })).toBeInTheDocument()
  })

  it('shows Not approved above the providers', async () => {
    render(<LoginScreen onSubmit={vi.fn()} onSso={async () => { throw new SsoNotApprovedError() }} initial={{ view: 'sso' }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Okta' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Your account isn’t approved yet')
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument()
  })

  it('shows any other failure with its message, and goes back to the access code', async () => {
    render(<LoginScreen onSubmit={vi.fn()} onSso={async () => { throw new Error('Popup blocked.') }} initial={{ view: 'sso' }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Popup blocked.'))
    fireEvent.click(screen.getByRole('button', { name: 'Use an access code instead' }))
    expect(screen.getByLabelText('Access code')).toBeInTheDocument()
  })
})
