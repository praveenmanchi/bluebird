import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen as dom, fireEvent, waitFor } from '@testing-library/preact'
import { App } from './App'
import { createRpcClient, createMockTransport } from '@shared/bridge'
import { ONBOARDING_MSG, PERSONA_MSG } from '@shared/session'
import { createMockHandlers } from '../../tests/mocks/handlers'
import { activePersonaId, changingPersona, screen, session, visibleTabs } from './state'
import { changePersona, choosePersona } from './session'

function mount(sessionBrand: string | null, onboarded = true, persona?: string | null) {
  const transport = createMockTransport(createMockHandlers({ sessionBrand, onboarded, persona }), 0)
  const client = createRpcClient(transport)
  return render(<App client={client} transport={transport} />)
}

beforeEach(() => { screen.value = 'boot'; session.value = null; document.documentElement.dataset.brand = 'bridge' })

describe('first-run persona', () => {
  it('goes splash, persona, tour, and opens on the picked persona’s tabs', async () => {
    mount('bridge', false, null)
    fireEvent.click(await dom.findByRole('region', { name: 'Loading' }))
    fireEvent.click(await dom.findByRole('radio', { name: 'Content' }, { timeout: 2000 }))
    fireEvent.click(dom.getByRole('button', { name: 'Continue as Content' }))
    await waitFor(() => expect(screen.value).toBe('onboarding'), { timeout: 3000 })
    expect(activePersonaId.value).toBe('content')
    expect(visibleTabs.value.map((t) => t.id)).toEqual(['agents', 'uxai', 'jira', 'history'])
  })

  it('skips both screens when a persona is stored, and applies it', async () => {
    mount('bridge', true, 'developer')
    await waitFor(() => expect(screen.value).toBe('app'))
    expect(activePersonaId.value).toBe('developer')
  })

  it('opens the app on the default persona when the store cannot be read', async () => {
    const handlers = { ...createMockHandlers({ sessionBrand: 'bridge', onboarded: true }), [PERSONA_MSG.status]: () => { throw new Error('storage down') } }
    const transport = createMockTransport(handlers, 0)
    render(<App client={createRpcClient(transport)} transport={transport} />)
    await waitFor(() => expect(screen.value).toBe('app'))
  })

  it('changes persona from Settings and returns to the app without the intro or tour', async () => {
    mount('bridge', false, 'developer')
    await waitFor(() => expect(screen.value).toBe('onboarding'))
    screen.value = 'app'
    changePersona()
    fireEvent.click(await dom.findByRole('button', { name: 'Change persona' }))
    fireEvent.click(await dom.findByRole('radio', { name: 'UI/UX Designer' }))
    fireEvent.click(dom.getByRole('button', { name: 'Continue as UI/UX Designer' }))
    await waitFor(() => expect(screen.value).toBe('app'), { timeout: 3000 })
    expect(activePersonaId.value).toBe('ui-designer')
  })

  it('keeps the Settings mode until the app opens, so the picker does not replay its intro during the save', async () => {
    let release = () => undefined as void
    const saving = new Promise<void>((resolve) => { release = resolve })
    const handlers = createMockHandlers({ sessionBrand: 'bridge', onboarded: true, persona: 'developer' })
    const transport = createMockTransport({ ...handlers, [PERSONA_MSG.select]: () => saving }, 0)
    const client = createRpcClient(transport)
    render(<App client={client} transport={transport} />)
    await waitFor(() => expect(screen.value).toBe('app'))
    changePersona()
    const done = choosePersona(client, 'content')
    expect(changingPersona.value).toBe(true)
    release()
    await done
    expect(changingPersona.value).toBe(false)
    expect(screen.value).toBe('app')
  })

  it('asks again when the stored persona has been turned off', async () => {
    mount('bridge', true, 'ux-designer')
    await waitFor(() => expect(screen.value).toBe('splash'))
  })

  it('goes back to Settings without changing anything', async () => {
    mount('bridge', true, 'developer')
    await waitFor(() => expect(screen.value).toBe('app'))
    changePersona()
    fireEvent.click(await dom.findByRole('button', { name: 'Change persona' }))
    fireEvent.click(dom.getByRole('button', { name: 'Back' }))
    expect(screen.value).toBe('settings')
    expect(activePersonaId.value).toBe('developer')
  })
})

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
    fireEvent.click(dom.getByRole('button', { name: 'Sign out' }))
    await waitFor(() => expect(screen.value).toBe('login'))
    expect(document.documentElement.dataset.brand).toBe('bridge')
    expect(await dom.findByLabelText('Access code')).toBeInTheDocument()
  })

  it('reset asks for confirmation, then returns to login', async () => {
    mount('disney')
    await waitFor(() => expect(screen.value).toBe('app'))
    fireEvent.click(dom.getByRole('button', { name: 'Settings' }))
    fireEvent.click(await dom.findByRole('button', { name: 'Reset all settings' }))
    fireEvent.click(dom.getByRole('button', { name: 'Yes, reset everything' }))
    await waitFor(() => expect(screen.value).toBe('login'))
  })
})

describe('first-run tour', () => {
  it('follows the first sign-in, then the team setup screen, and never shows again', async () => {
    mount(null, false)
    fireEvent.input(await dom.findByLabelText('Access code'), { target: { value: 'bridge-2026' } })
    fireEvent.click(dom.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(screen.value).toBe('onboarding'))
    expect(dom.getByRole('heading', { name: 'Welcome to Design Studio' })).toBeInTheDocument()
    fireEvent.click(dom.getByRole('button', { name: 'Skip' }))
    // The team setup file gets a screen of its own after the tour, skipped or finished.
    await waitFor(() => expect(screen.value).toBe('team-setup'))
    expect(dom.getByRole('heading', { name: 'Set up from your team’s file' })).toBeInTheDocument()
    fireEvent.click(dom.getByRole('button', { name: 'Skip for now' }))
    await waitFor(() => expect(screen.value).toBe('app'))
    fireEvent.click(dom.getByRole('button', { name: 'Settings' }))
    fireEvent.click(await dom.findByRole('button', { name: 'Sign out' }))
    await waitFor(() => expect(screen.value).toBe('login'))
    fireEvent.input(await dom.findByLabelText('Access code'), { target: { value: 'bridge-2026' } })
    fireEvent.click(dom.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(screen.value).toBe('app'))
  })

  it('can be replayed from Settings and goes straight back to the app', async () => {
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

