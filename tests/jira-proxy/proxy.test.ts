import { describe, it, expect, vi } from 'vitest'
import { allowedTarget, handleProxyRequest, parseHosts, TARGET_HEADER, trustedCaller, upstreamUrl, type Upstream } from '../../tools/jira-proxy/proxy'

const ok = (body: string, status = 200): Awaited<ReturnType<Upstream>> => ({ status, headers: { get: () => 'application/json' }, text: async () => body })

describe('jira proxy', () => {
  it('only allows https Atlassian Cloud sites and listed hosts', () => {
    expect(allowedTarget('https://team.atlassian.net', [])?.host).toBe('team.atlassian.net')
    expect(allowedTarget('http://team.atlassian.net', [])).toBeNull()
    expect(allowedTarget('https://evil.example.com', [])).toBeNull()
    expect(allowedTarget('https://atlassian.net.evil.com', [])).toBeNull()
    expect(allowedTarget('https://user:pw@team.atlassian.net', [])).toBeNull()
    expect(allowedTarget('https://jira.acme.com/jira', ['jira.acme.com'])?.pathname).toBe('/jira')
    expect(allowedTarget(undefined, [])).toBeNull()
    expect(parseHosts(' jira.acme.com, ,jira.internal ')).toEqual(['jira.acme.com', 'jira.internal'])
  })

  it('answers preflight and health with CORS headers', async () => {
    const upstream = vi.fn<Upstream>()
    const pre = await handleProxyRequest({ method: 'OPTIONS', url: '/rest/api/3/myself', headers: {} }, [], upstream)
    expect(pre.status).toBe(204)
    expect(pre.headers['access-control-allow-origin']).toBe('*')
    expect(pre.headers['access-control-allow-headers']).toContain(TARGET_HEADER)
    const health = await handleProxyRequest({ method: 'GET', url: '/', headers: {} }, [], upstream)
    expect(JSON.parse(health.body)).toEqual({ ok: true, service: 'bluebird-jira-proxy' })
    expect(upstream).not.toHaveBeenCalled()
  })

  it('forwards only REST calls to an allowed target with the auth header', async () => {
    const upstream = vi.fn<Upstream>(async () => ok('{"accountId":"1"}'))
    const res = await handleProxyRequest({
      method: 'POST', url: '/rest/api/3/search/jql?x=1', body: '{"jql":"x"}',
      headers: { [TARGET_HEADER]: 'https://team.atlassian.net/', authorization: 'Basic abc', 'content-type': 'application/json', cookie: 'secret' },
    }, [], upstream)
    expect(res.status).toBe(200)
    expect(res.headers['access-control-allow-origin']).toBe('*')
    const [url, init] = upstream.mock.calls[0]!
    expect(url).toBe('https://team.atlassian.net/rest/api/3/search/jql?x=1')
    expect(init.method).toBe('POST')
    expect(init.body).toBe('{"jql":"x"}')
    expect(init.headers).toEqual({ authorization: 'Basic abc', 'content-type': 'application/json', 'x-atlassian-token': 'no-check' })
    expect(init.redirect).toBe('manual')
  })

  it('keeps paths under the target REST root', () => {
    const cloud = new URL('https://team.atlassian.net')
    expect(upstreamUrl(cloud, '/rest/api/3/myself')).toBe('https://team.atlassian.net/rest/api/3/myself')
    expect(upstreamUrl(new URL('https://jira.acme.com/jira'), '/rest/api/2/search')).toBe('https://jira.acme.com/jira/rest/api/2/search')
    for (const bad of ['/rest/../secure/Admin.jspa', '/rest/%2e%2e/x', '/rest/api%2fx', '/rest\\..\\x', '/admin']) expect(upstreamUrl(cloud, bad)).toBeNull()
    expect(allowedTarget('https://team.atlassian.net/?x=1', [])).toBeNull()
  })

  it('only answers localhost-addressed requests from Figma or localhost pages', async () => {
    expect(trustedCaller({ host: 'localhost:8787', origin: 'null' })).toBe(true)
    expect(trustedCaller({ host: '127.0.0.1:8787', origin: 'http://localhost:5173' })).toBe(true)
    expect(trustedCaller({ host: 'localhost:8787' })).toBe(true)
    expect(trustedCaller({ host: 'evil.example.com:8787', origin: 'null' })).toBe(false)
    expect(trustedCaller({ host: 'localhost:8787', origin: 'https://evil.example.com' })).toBe(false)
    const upstream = vi.fn<Upstream>()
    const res = await handleProxyRequest({ method: 'GET', url: '/rest/api/3/myself', headers: { host: 'localhost:8787', origin: 'https://evil.example.com', [TARGET_HEADER]: 'https://team.atlassian.net' } }, [], upstream)
    expect(res.status).toBe(403)
    expect((await handleProxyRequest({ method: 'PATCH', url: '/rest/api/3/myself', headers: { [TARGET_HEADER]: 'https://team.atlassian.net' } }, [], upstream)).status).toBe(405)
    expect(upstream).not.toHaveBeenCalled()
  })

  it('does not follow redirects off the allow-listed host', async () => {
    const upstream = vi.fn<Upstream>(async () => ({ status: 302, headers: { get: () => null }, text: async () => '' }))
    const res = await handleProxyRequest({ method: 'GET', url: '/rest/api/3/myself', headers: { [TARGET_HEADER]: 'https://team.atlassian.net' } }, [], upstream)
    expect(res.status).toBe(502)
  })

  it('refuses unknown targets and non-REST paths without calling upstream', async () => {
    const upstream = vi.fn<Upstream>()
    expect((await handleProxyRequest({ method: 'GET', url: '/rest/api/3/myself', headers: { [TARGET_HEADER]: 'https://evil.example.com' } }, [], upstream)).status).toBe(400)
    expect((await handleProxyRequest({ method: 'GET', url: '/admin', headers: { [TARGET_HEADER]: 'https://team.atlassian.net' } }, [], upstream)).status).toBe(404)
    expect(upstream).not.toHaveBeenCalled()
  })

  it('turns network failures into a 502 with a readable message', async () => {
    const upstream = vi.fn<Upstream>(async () => { throw new TypeError('fetch failed') })
    const res = await handleProxyRequest({ method: 'GET', url: '/rest/api/3/myself', headers: { [TARGET_HEADER]: 'https://team.atlassian.net' } }, [], upstream)
    expect(res.status).toBe(502)
    expect(JSON.parse(res.body).errorMessages[0]).toContain('team.atlassian.net')
  })
})
