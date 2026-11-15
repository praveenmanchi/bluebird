import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen as dom, fireEvent, waitFor } from '@testing-library/preact'
import { App } from '../App'
import { createRpcClient, createMockTransport } from '@shared/bridge'
import { WINDOW_MINI, WINDOW_PRESETS } from '@shared/config'
import { createMockHandlers } from '../../../tests/mocks/handlers'
import { minimized, screen, session, windowSize } from '../state'

beforeEach(() => { screen.value = 'boot'; session.value = null; minimized.value = false; windowSize.value = WINDOW_PRESETS.L })

describe('minimize', () => {
  it('shrinks the plugin to the launcher and restores the size it had, keeping the tab open', async () => {
    const onResize = vi.fn()
    const transport = createMockTransport(createMockHandlers({ sessionBrand: 'bridge', onboarded: true, persona: 'developer', onResize }), 0)
    render(<App client={createRpcClient(transport)} transport={transport} />)
    await waitFor(() => expect(screen.value).toBe('app'))
    const tabs = dom.getByRole('navigation', { name: 'Sections' })
    expect(tabs).toBeVisible()

    fireEvent.click(dom.getByRole('button', { name: 'Minimize' }))
    await waitFor(() => expect(onResize).toHaveBeenLastCalledWith(WINDOW_MINI))
    const launcher = dom.getByRole('button', { name: 'Open Bluebird' })
    expect(tabs).not.toBeVisible() // still mounted, so the tab keeps its state

    fireEvent.click(launcher)
    await waitFor(() => expect(onResize).toHaveBeenLastCalledWith(WINDOW_PRESETS.L))
    expect(dom.queryByRole('button', { name: 'Open Bluebird' })).toBeNull()
    expect(tabs).toBeVisible()
  })
})
