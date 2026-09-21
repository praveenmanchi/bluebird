import { describe, it, expect, vi } from 'vitest'
import { createRouter } from './sandbox-router'
import { createRpcClient, BridgeError } from './ui-client'
import { createMockTransport } from './transports/mock'
import { parseMessage } from './messages'

describe('parseMessage', () => {
  it('accepts well-formed envelopes and rejects everything else', () => {
    expect(parseMessage({ kind: 'request', id: '1', type: 'a11y:scan', payload: null })?.kind).toBe('request')
    expect(parseMessage({ kind: 'request', id: '1', type: 'nonamespace', payload: null })).toBeNull()
    expect(parseMessage('nope')).toBeNull()
    expect(parseMessage(undefined)).toBeNull()
  })
})

describe('router', () => {
  it('dispatches to the exact handler and wraps the result', async () => {
    const send = vi.fn()
    const router = createRouter({ 'x:echo': (p: unknown) => ({ got: p }) }, send)
    await router.handle({ kind: 'request', id: 'a', type: 'x:echo', payload: 42 })
    expect(send).toHaveBeenCalledWith({ kind: 'response', id: 'a', ok: true, data: { got: 42 } })
  })

  it('turns thrown errors into error responses', async () => {
    const send = vi.fn()
    const router = createRouter({ 'x:boom': () => { throw new Error('kaboom') } }, send)
    await router.handle({ kind: 'request', id: 'b', type: 'x:boom', payload: null })
    expect(send).toHaveBeenCalledWith({ kind: 'response', id: 'b', ok: false, error: 'kaboom' })
  })

  it('reports unknown message types', async () => {
    const send = vi.fn()
    await createRouter({}, send).handle({ kind: 'request', id: 'c', type: 'x:nope', payload: null })
    expect(send.mock.calls[0]?.[0]).toMatchObject({ ok: false, error: expect.stringContaining('No handler') })
  })

  it('ignores non-request traffic', async () => {
    const send = vi.fn()
    await createRouter({}, send).handle({ kind: 'event', type: 'x:y', payload: 1 })
    await createRouter({}, send).handle('garbage')
    expect(send).not.toHaveBeenCalled()
  })

  it('lets handlers emit events', async () => {
    const send = vi.fn()
    const router = createRouter({ 'x:go': (_p: unknown, ctx) => { ctx.emit('x:progress', 1); return 'done' } }, send)
    await router.handle({ kind: 'request', id: 'd', type: 'x:go', payload: null })
    expect(send).toHaveBeenNthCalledWith(1, { kind: 'event', type: 'x:progress', payload: 1 })
  })
})

describe('rpc client over mock transport', () => {
  it('round-trips a request and delivers events', async () => {
    const transport = createMockTransport({
      'x:sum': (p: { a: number; b: number }, ctx) => { ctx.emit('x:tick', 'hi'); return p.a + p.b },
    }, 0)
    const client = createRpcClient(transport)
    const ticks: unknown[] = []
    client.on('x:tick', (p) => ticks.push(p))
    await expect(client.call<number>('x:sum', { a: 2, b: 3 })).resolves.toBe(5)
    expect(ticks).toEqual(['hi'])
  })

  it('rejects with BridgeError on handler failure', async () => {
    const client = createRpcClient(createMockTransport({ 'x:fail': () => { throw new Error('nope') } }, 0))
    await expect(client.call('x:fail')).rejects.toBeInstanceOf(BridgeError)
  })

  it('times out when no response arrives', async () => {
    vi.useFakeTimers()
    const client = createRpcClient({ send: () => undefined, subscribe: () => () => undefined })
    const promise = client.call('x:never', null, 50)
    vi.advanceTimersByTime(60)
    await expect(promise).rejects.toThrow(/timed out/)
    vi.useRealTimers()
  })
})
