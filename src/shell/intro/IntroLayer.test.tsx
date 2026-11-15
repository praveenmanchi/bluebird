import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen as dom, fireEvent, waitFor } from '@testing-library/preact'
import { App } from '../App'
import { createRpcClient, createMockTransport, type Handler, type HandlerContext, type HandlerMap } from '@shared/bridge'
import { INTRO_MSG, type IntroState } from '@shared/session'
import { createMockHandlers } from '../../../tests/mocks/handlers'
import { activeTabId, screen, session } from '../state'
import { introState } from './state'

function mount(handlers: HandlerMap) {
  const transport = createMockTransport(handlers, 0)
  render(<App client={createRpcClient(transport)} transport={transport} />)
}

beforeEach(() => { screen.value = 'boot'; session.value = null; introState.value = null; document.documentElement.dataset.brand = 'bridge' })

describe('IntroLayer in the app', () => {
  it('shows the layout intro once, then the open tab’s intro, and the footer replays it', async () => {
    mount(createMockHandlers({ sessionBrand: 'bridge', introsDone: false }))
    expect(await dom.findByRole('dialog', { name: 'Plugin layout intro' }, { timeout: 3000 })).toBeInTheDocument()
    expect(dom.getByText('Your tabs')).toBeInTheDocument()
    fireEvent.click(dom.getByRole('button', { name: /Skip tour/ }))
    const tabIntro = await dom.findByRole('dialog', { name: /intro$/ }, { timeout: 3000 })
    expect(tabIntro.getAttribute('aria-label')).not.toBe('Plugin layout intro')
    expect(dom.getByText(/^Welcome to /)).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(dom.queryByRole('dialog')).toBeNull())
    expect(introState.value?.layoutDone).toBe(true)
    expect(introState.value?.seenTabs).toContain(activeTabId.value)
    // The footer's info button replays it, pressed while open.
    fireEvent.click(dom.getByRole('button', { name: 'Show tab intro' }))
    expect(await dom.findByText(/^Welcome to /)).toBeInTheDocument()
    await waitFor(() => expect(dom.getByRole('button', { name: 'Show tab intro' })).toHaveAttribute('aria-pressed', 'true'))
  })

  it('announces a tab added by an update, badges it until opened, and never again after Later', async () => {
    const base = createMockHandlers({ sessionBrand: 'bridge', introsDone: true })
    let stored: IntroState | null = null
    const handlers: HandlerMap = {
      ...base,
      [INTRO_MSG.status]: async () => {
        const s = (await (base[INTRO_MSG.status] as Handler)(undefined, {} as HandlerContext)) as IntroState
        // Pretend the last open predates History: every other tab is known, all intros seen.
        stored ??= { ...s, knownTabs: s.knownTabs!.filter((t) => t !== 'history') }
        return stored
      },
    }
    mount(handlers)
    expect(await dom.findByRole('heading', { name: 'New tab: History' }, { timeout: 3000 })).toBeInTheDocument()
    expect(dom.getByText('New')).toBeInTheDocument()
    fireEvent.click(dom.getByRole('button', { name: 'Later' }))
    await waitFor(() => expect(dom.queryByRole('dialog')).toBeNull())
    expect(introState.value?.announced).toContain('history')
    // The badge stays until the tab is opened.
    expect(dom.getByText('New')).toBeInTheDocument()
  })
})
