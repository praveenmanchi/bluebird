import { describe, it, expect, vi, afterEach } from 'vitest'
import { HISTORY_CHECK, historyUnseen, watchHistory } from './watch'

afterEach(() => { vi.useRealTimers(); historyUnseen.value = 0 })

describe('watchHistory', () => {
  it('checks at once and then on the interval, until stopped', async () => {
    vi.useFakeTimers()
    let n = 0
    const call = vi.fn(async (type: string) => { expect(type).toBe(HISTORY_CHECK); n += 1; return { connected: true, unseen: n, by: [] } })
    const stop = watchHistory({ call } as never, 60_000)
    await vi.advanceTimersByTimeAsync(0)
    expect(historyUnseen.value).toBe(1)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(historyUnseen.value).toBe(2)
    stop()
    await vi.advanceTimersByTimeAsync(120_000)
    expect(call).toHaveBeenCalledTimes(2)
  })

  it('checks only once when automatic checks are off, and ignores failures', async () => {
    vi.useFakeTimers()
    const call = vi.fn(async () => { throw new Error('offline') })
    watchHistory({ call } as never, 0)
    await vi.advanceTimersByTimeAsync(600_000)
    expect(call).toHaveBeenCalledTimes(1)
    expect(historyUnseen.value).toBe(0)
  })
})
