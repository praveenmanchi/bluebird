import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen as dom, fireEvent, waitFor } from '@testing-library/preact'
import { App } from './App'
import { createRpcClient, createMockTransport } from '@shared/bridge'
import { ONBOARDING_MSG } from '@shared/session'
import { createMockHandlers } from '../../tests/mocks/handlers'
import { screen, session } from './state'

function mount(sessionBrand: string | null, onboarded = true) {
  const transport = createMockTransport(createMockHandlers({ sessionBrand, onboarded }), 0)
  const client = createRpcClient(transport)
  return render(<App client={client} transport={transport} />)
}

beforeEach(() => { screen.value = 'boot'; session.value = null; document.documentElement.dataset.brand = 'bridge' })

describe('access-code session', () => {
  it('shows the login screen without a session and unlocks the brand for a valid code', async () => {
    mount(null)
    const input = await dom.findByLabelText('Access code')
    expect(dom.getByRole('button', { name: 'Sign in' })).toBeDisabled()
    fireEvent.input(input, { target: { value: 'wrong' } })
    fireEvent.click(dom.getByRole('button', { name: 'Sign in' }))
    expect(await dom.findByText(/not recognised/)).toBeInTheDocument()
    expect(dom.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    fireEvent.input(input, { target: { value: 'fiskars-2026' } })
    fireEvent.click(dom.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(screen.value).toBe('app'))
    expect(document.documentElement.dataset.brand).toBe('fiskars')
    expect(dom.getByRole('button', { name: 'Settings' })).toBeInTheDocument()
  })

  it('explains that SSO is not configured and returns to the access code', async () => {
    mount(null)
    fireEvent.click(await dom.findByRole('button', { name: 'Sign in with SSO' }))
    fireEvent.click(dom.getByRole('button', { name: 'Continue with Okta' }))
    expect(await dom.findByRole('alert')).toHaveTextContent(/SSO isn’t set up/)
    fireEvent.click(dom.getByRole('button', { name: 'Use an access code instead' }))
    expect(await dom.findByLabelText('Access code')).toBeInTheDocument()
    expect(screen.value).toBe('login')
  })

  it('restores an existing session, opens settings from the gear and logs off back to login', async () => {
    mount('ikea')
    await waitFor(() => expect(screen.value).toBe('app'))
    expect(document.documentElement.dataset.brand).toBe('ikea')
    fireEvent.click(dom.getByRole('button', { name: 'Settings' }))
    expect(await dom.findByText(/Signed in as Ikea/)).toBeInTheDocument()
    fireEvent.click(dom.getByRole('button', { name: 'Logoff session' }))
    await waitFor(() => expect(screen.value).toBe('login'))
    expect(document.documentElement.dataset.brand).toBe('bridge')
    expect(await dom.findByLabelText('Access code')).toBeInTheDocument()
  })

  it('reset asks for confirmation, then returns to login', async () => {
    mount('disney')
    await waitFor(() => expect(screen.value).toBe('app'))
    fireEvent.click(dom.getByRole('button', { name: 'Settings' }))
    fireEvent.click(await dom.findByRole('button', { name: 'Reset all Settings' }))
    fireEvent.click(dom.getByRole('button', { name: 'Yes, reset everything' }))
    await waitFor(() => expect(screen.value).toBe('login'))
  })
})

describe('first-run tour', () => {
  it('follows the first sign-in, and Skip opens the app for good', async () => {
    mount(null, false)
    fireEvent.input(await dom.findByLabelText('Access code'), { target: { value: 'bridge-2026' } })
    fireEvent.click(dom.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(screen.value).toBe('onboarding'))
    expect(dom.getByRole('heading', { name: 'Welcome to Design Studio' })).toBeInTheDocument()
    fireEvent.click(dom.getByRole('button', { name: 'Skip' }))
    await waitFor(() => expect(screen.value).toBe('app'))
    fireEvent.click(dom.getByRole('button', { name: 'Settings' }))
    fireEvent.click(await dom.findByRole('button', { name: 'Logoff session' }))
    await waitFor(() => expect(screen.value).toBe('login'))
    fireEvent.input(await dom.findByLabelText('Access code'), { target: { value: 'bridge-2026' } })
    fireEvent.click(dom.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(screen.value).toBe('app'))
  })

  it('can be replayed from Settings and finished with Get started', async () => {
    mount('ikea')
    await waitFor(() => expect(screen.value).toBe('app'))
    fireEvent.click(dom.getByRole('button', { name: 'Settings' }))
    fireEvent.click(await dom.findByRole('button', { name: 'Replay tour' }))
    await waitFor(() => expect(screen.value).toBe('onboarding'))
    const steps = dom.getAllByRole('button', { name: /^Step \d+ of/ })
    fireEvent.click(steps.at(-1)!)
    fireEvent.click(dom.getByRole('button', { name: 'Get started' }))
    await waitFor(() => expect(screen.value).toBe('app'))
  })

  it('opens the app when the tour flag can’t be read', async () => {
    const handlers = { ...createMockHandlers({ sessionBrand: 'bridge', onboarded: false }), [ONBOARDING_MSG.status]: async () => { throw new Error('bridge down') } }
    const transport = createMockTransport(handlers, 0)
    render(<App client={createRpcClient(transport)} transport={transport} />)
    await waitFor(() => expect(screen.value).toBe('app'))
  })
})

