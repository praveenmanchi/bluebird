import { describe, it, expect, vi } from 'vitest'
import { createFigmaGet, retryWaitMs, RATE_LIMIT_RETRIES, type HttpFetch } from '../rest'

const reply = (status: number, body: unknown, retryAfter?: string) => ({
  status,
  text: async () => JSON.stringify(body),
  headers: { get: (name: string) => (name.toLowerCase() === 'retry-after' ? retryAfter ?? null : null) },
})

describe('createFigmaGet — rate limits', () => {
  it('waits for Retry-After and retries a 429, then returns the answer', async () => {
    const answers = [reply(429, { err: 'Rate limit' }, '3'), reply(200, { ok: true })]
    const fetch = vi.fn<HttpFetch>(async () => answers.shift()!)
    const sleep = vi.fn<(ms: number) => Promise<void>>(async () => undefined)
    const get = createFigmaGet('t', 'File 1', fetch, sleep)
    await expect(get('/files/V/variables/local', 'variables')).resolves.toEqual({ ok: true })
    expect(sleep).toHaveBeenCalledWith(3000)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('gives up with a readable message after the retries', async () => {
    const fetch = vi.fn<HttpFetch>(async () => reply(429, { err: 'Rate limit' }))
    const sleep = vi.fn<(ms: number) => Promise<void>>(async () => undefined)
    const get = createFigmaGet('t', 'File 1', fetch, sleep)
    await expect(get('/files/V/variables/local', 'variables')).rejects.toThrow(/rate-limiting/)
    expect(fetch).toHaveBeenCalledTimes(RATE_LIMIT_RETRIES + 1)
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([1000, 2000])
  })

  it('backs off without Retry-After and caps the wait', () => {
    expect(retryWaitMs(null, 0)).toBe(1000)
    expect(retryWaitMs(undefined, 1)).toBe(2000)
    expect(retryWaitMs('120', 0)).toBe(10_000)
  })
})
