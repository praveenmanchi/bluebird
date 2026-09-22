import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen as dom, fireEvent, waitFor } from '@testing-library/preact'
import { App } from './App'
import { createRpcClient, createMockTransport } from '@shared/bridge'
import { createMockHandlers } from '../../tests/mocks/handlers'
import { screen, session } from './state'

function mount(sessionBrand: string | null) {
  const transport = createMockTransport(createMockHandlers({ sessionBrand }), 0)
  const client = createRpcClient(transport)
  return render(<App client={client} transport={transport} />)
}

beforeEach(() => { screen.value = 'boot'; session.value = null; document.documentElement.dataset.brand = 'bridge' })

describe('access-code session', () => {
  it('shows the login screen without a session and unlocks the brand for a valid code', async () => {
    mount(null)
    const input = await dom.findByLabelText('Access code')
    fireEvent.input(input, { target: { value: 'wrong' } })
    fireEvent.click(dom.getByRole('button', { name: 'Submit' }))
    expect(await dom.findByText(/not recognised/)).toBeInTheDocument()
    fireEvent.input(input, { target: { value: 'fiskars-2026' } })
    fireEvent.click(dom.getByRole('button', { name: 'Submit' }))
    await waitFor(() => expect(screen.value).toBe('app'))
    expect(document.documentElement.dataset.brand).toBe('fiskars')
    expect(dom.getByRole('button', { name: 'Settings' })).toBeInTheDocument()
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

  it('"Keep me signed in" round-trips through session:update', async () => {
    mount('bridge')
    await waitFor(() => expect(screen.value).toBe('app'))
    fireEvent.click(dom.getByRole('button', { name: 'Settings' }))
    const toggle = await dom.findByRole('switch', { name: 'Keep me signed in' })
    expect(toggle).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(toggle)
    await waitFor(() => expect(session.value?.keepSignedIn).toBe(false))
    expect(dom.getByRole('switch', { name: 'Keep me signed in' })).toHaveAttribute('aria-checked', 'false')
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
