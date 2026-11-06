import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const connect = vi.hoisted(() => vi.fn(() => ({ onStatus: vi.fn(), subscribe: vi.fn(), send: vi.fn() })))
vi.mock('@shared/bridge', () => ({ createWebSocketTransport: connect, parseMessage: (m: unknown) => m }))

const fromSandbox = (pluginMessage: unknown) => window.dispatchEvent(new MessageEvent('message', { data: { pluginMessage } }))
const token = (payload: string) => fromSandbox({ kind: 'event', type: 'bridge:token', payload })

describe('live bridge auto-connect', () => {
  beforeEach(async () => {
    vi.resetModules()
    connect.mockClear()
    document.body.innerHTML = '<span id="status"></span><input id="token" /><button id="connect"></button>'
    await import('./bridge')
  })
  afterEach(() => { document.body.innerHTML = '' })

  it('connects when the saved token arrives', () => {
    token('')
    expect(connect).toHaveBeenCalledOnce()
  })

  it('still connects when another message arrives first', () => {
    fromSandbox({ kind: 'event', type: 'shell:selection', payload: { count: 1 } })
    window.dispatchEvent(new MessageEvent('message', { data: 'not a plugin message' }))
    token('abc')
    expect(connect).toHaveBeenCalledWith(expect.objectContaining({ token: 'abc' }))
  })

  it('connects once, however many token messages arrive', () => {
    token('')
    token('')
    expect(connect).toHaveBeenCalledOnce()
  })
})
