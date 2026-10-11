import { describe, expect, it, vi } from 'vitest'
import { installFigmaMock } from '../../../../tests/mocks/figma'
import { handlers } from '../sandbox/handler'
import { MSG } from '../messages'

const call = (type: string, payload: unknown) => (handlers[type] as unknown as (p: unknown) => Promise<void> | void)(payload)

describe('mcp:focus', () => {
  it('selects the frame and scrolls it into view', async () => {
    const node = { id: '1:2', type: 'FRAME' }
    const figma = installFigmaMock({ getNodeByIdAsync: vi.fn(async () => node) as unknown as PluginAPI['getNodeByIdAsync'] })
    await call(MSG.focus, { nodeId: '1:2' })
    expect(figma.currentPage.selection).toEqual([node])
    expect(figma.viewport.scrollAndZoomIntoView).toHaveBeenCalledWith([node])
  })

  it('rejects a missing frame and an invalid payload', async () => {
    installFigmaMock()
    await expect(call(MSG.focus, { nodeId: '9:9' })).rejects.toThrow('no longer exists')
    await expect(call(MSG.focus, { nodeId: '' })).rejects.toThrow()
  })
})

describe('mcp:open', () => {
  it('opens an https link in the browser', () => {
    const openExternal = vi.fn()
    installFigmaMock({ openExternal } as unknown as Partial<PluginAPI>)
    call(MSG.open, { url: 'https://github.com/praveenmanchi/bluebird/pull/63' })
    expect(openExternal).toHaveBeenCalledWith('https://github.com/praveenmanchi/bluebird/pull/63')
  })

  it('refuses anything that is not an https link', () => {
    const openExternal = vi.fn()
    installFigmaMock({ openExternal } as unknown as Partial<PluginAPI>)
    for (const url of ['javascript:alert(1)', 'http://github.com/x', 'data:text/html,hi', 'https://']) {
      expect(() => call(MSG.open, { url })).toThrow()
    }
    expect(openExternal).not.toHaveBeenCalled()
  })
})
