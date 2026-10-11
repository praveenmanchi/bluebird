import { describe, it, expect, vi } from 'vitest'
import { installFigmaMock } from '../../../../tests/mocks/figma'
import { handlers } from '../sandbox/handler'
import { MSG } from '../messages'

const focus = (payload: unknown) => (handlers[MSG.focus] as unknown as (p: unknown) => Promise<void>)(payload)

describe('agents:focus', () => {
  it('selects the layer and scrolls to it', async () => {
    const node = { id: '1:2', type: 'FRAME' }
    const figma = installFigmaMock({ getNodeByIdAsync: vi.fn(async () => node) as unknown as PluginAPI['getNodeByIdAsync'] })
    await focus({ nodeId: '1:2' })
    expect(figma.currentPage.selection).toEqual([node])
    expect(figma.viewport.scrollAndZoomIntoView).toHaveBeenCalledWith([node])
  })

  it('says so when the layer is gone, and rejects a bad payload', async () => {
    installFigmaMock()
    await expect(focus({ nodeId: 'fixture:a1' })).rejects.toThrow('Layer no longer exists')
    await expect(focus({ nodeId: '' })).rejects.toThrow()
  })
})
