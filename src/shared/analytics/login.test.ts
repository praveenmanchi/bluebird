import { describe, it, expect, vi } from 'vitest'
import { reportLogin } from './login'

const USER = 'a'.repeat(64)

describe('reportLogin', () => {
  it('posts brand, user key and version to the broker as the plugin', async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 204 }))
    expect(await reportLogin({ brand: 'gap', userKey: USER }, { url: 'https://connect.example.com/', version: '1.3.143', fetch })).toBe(true)
    expect(fetch).toHaveBeenCalledOnce()
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://connect.example.com/events/login')
    expect(init.method).toBe('POST')
    expect(init.headers).toMatchObject({ 'x-connect-client': 'bluebird', 'content-type': 'application/json' })
    expect(JSON.parse(init.body as string)).toEqual({ brand: 'gap', user: USER, version: '1.3.143' })
  })

  it('sends nothing when no analytics address is built in', async () => {
    const fetch = vi.fn()
    expect(await reportLogin({ brand: 'gap', userKey: USER }, { url: '', version: '1', fetch })).toBe(false)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('never throws: a refused or failed report only answers false', async () => {
    const refused = vi.fn(async () => new Response(null, { status: 403 }))
    const offline = vi.fn(async () => { throw new TypeError('Failed to fetch') })
    expect(await reportLogin({ brand: 'gap', userKey: null }, { url: 'https://c.example.com', version: '1', fetch: refused })).toBe(false)
    expect(await reportLogin({ brand: 'gap', userKey: null }, { url: 'https://c.example.com', version: '1', fetch: offline })).toBe(false)
  })
})
