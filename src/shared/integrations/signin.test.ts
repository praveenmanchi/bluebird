import { describe, expect, it, vi } from 'vitest'
import { pollSignIn, requestKeys, signInBroker, signInExpired, startUrl, SignInError } from './signin'

type Reply = { status: number; body?: unknown } | Error
const KEYS = { read: 'r'.repeat(32), write: 'w'.repeat(32), code: 'K7Q-X92' }

/** Answers each request with the next reply. */
function fakeFetch(replies: Reply[]) {
  const urls: string[] = []
  const headers: Record<string, string>[] = []
  const fetch = vi.fn(async (url: string, init: { headers: Record<string, string> }) => {
    urls.push(url)
    headers.push(init.headers)
    const reply = replies.shift()
    if (!reply) throw new Error('no more replies')
    if (reply instanceof Error) throw reply
    return { status: reply.status, json: async () => reply.body }
  })
  return { fetch, urls, headers }
}
const noSleep = async () => undefined

describe('sign-in broker', () => {
  it('uses the company gateway, and has nothing until Bluebird Cloud exists', () => {
    expect(signInBroker(' https://gw.acme.internal/ ')).toBe('https://gw.acme.internal')
    expect(signInBroker('')).toBeNull()
  })

  it('builds the start page with the host and the write key only', () => {
    expect(startUrl('https://gw.acme.internal/', 'github', 'github.acme.com', KEYS.write)).toBe(`https://gw.acme.internal/auth/github/start?host=github.acme.com&write=${KEYS.write}`)
  })

  it('asks the broker for a key pair and checks what comes back', async () => {
    const ok = fakeFetch([{ status: 200, body: KEYS }])
    await expect(requestKeys('https://gw', 'jira', { fetch: ok.fetch })).resolves.toEqual(KEYS)
    expect(ok.urls).toEqual(['https://gw/auth/jira/keys'])
    expect(ok.headers[0]).toEqual({ 'x-connect-client': 'bluebird' })
    await expect(requestKeys('https://gw', 'jira', { fetch: fakeFetch([{ status: 200, body: { read: 'x' } }]).fetch })).rejects.toThrow(SignInError)
    // The confirm code is what stops a phished start link: a broker that sends none (or a malformed one) is refused.
    await expect(requestKeys('https://gw', 'jira', { fetch: fakeFetch([{ status: 200, body: { ...KEYS, code: undefined } }]).fetch })).rejects.toThrow(SignInError)
    await expect(requestKeys('https://gw', 'jira', { fetch: fakeFetch([{ status: 200, body: { ...KEYS, code: '<b>hi</b>' } }]).fetch })).rejects.toThrow(SignInError)
    await expect(requestKeys('https://gw', 'jira', { fetch: fakeFetch([{ status: 500 }]).fetch })).rejects.toThrow('answered 500')
    await expect(requestKeys('https://gw', 'jira', { fetch: fakeFetch([new TypeError('Failed to fetch')]).fetch })).rejects.toThrow('Couldn’t reach the sign-in service')
  })
})

describe('pollSignIn', () => {
  it('waits while the broker says pending, then returns the token', async () => {
    const { fetch, urls, headers } = fakeFetch([{ status: 202 }, { status: 204 }, { status: 200, body: { accessToken: 'gho_x', account: '@maria-r', expiresAt: '2026-12-01T00:00:00Z' } }])
    await expect(pollSignIn('https://gw/', KEYS.read, { fetch, sleep: noSleep })).resolves.toEqual({ accessToken: 'gho_x', account: '@maria-r', expiresAt: '2026-12-01T00:00:00Z' })
    const site = { cloudId: '0a1b2c3d-4e5f-6789-abcd-ef0123456789', url: 'https://acme.atlassian.net' }
    const jira = fakeFetch([{ status: 200, body: { accessToken: 'atl', account: 'Maria Rossi', expiresAt: '', site } }])
    await expect(pollSignIn('https://gw/', KEYS.read, { fetch: jira.fetch, sleep: noSleep })).resolves.toMatchObject({ site })
    expect(urls).toHaveLength(3)
    // The read key goes in a header, never the URL.
    expect(urls[0]).toBe('https://gw/auth/poll')
    expect(headers[0]).toEqual({ 'x-connect-client': 'bluebird', 'x-connect-read': KEYS.read })
  })

  it('says when the key expired, the answer is unreadable, or it took too long', async () => {
    await expect(pollSignIn('https://gw', KEYS.read, { fetch: fakeFetch([{ status: 410 }]).fetch, sleep: noSleep })).rejects.toThrow('expired')
    await expect(pollSignIn('https://gw', KEYS.read, { fetch: fakeFetch([{ status: 403 }]).fetch, sleep: noSleep })).rejects.toThrow('cancelled')
    await expect(pollSignIn('https://gw', KEYS.read, { fetch: fakeFetch([{ status: 200, body: { accessToken: '' } }]).fetch, sleep: noSleep })).rejects.toThrow('can’t read')
    let t = 0
    const pending = fakeFetch(Array.from({ length: 10 }, () => ({ status: 202 })))
    await expect(pollSignIn('https://gw', KEYS.read, { fetch: pending.fetch, sleep: noSleep, timeoutMs: 3, now: () => t++ })).rejects.toThrow('took too long')
  })

  it('stops when cancelled', async () => {
    const abort = new AbortController()
    abort.abort()
    await expect(pollSignIn('https://gw', KEYS.read, { fetch: fakeFetch([]).fetch, signal: abort.signal, sleep: noSleep })).rejects.toThrow()
  })

  it('knows when a stored sign-in has expired', () => {
    const now = Date.parse('2026-11-26T12:00:00Z')
    expect(signInExpired('2026-11-26T11:00:00Z', now)).toBe(true)
    expect(signInExpired('2026-11-27T11:00:00Z', now)).toBe(false)
    expect(signInExpired('', now)).toBe(false)
  })
})
