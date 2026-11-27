// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { CloudConfigError, connectFromWorkerEnv } from '../../tools/connect/cloud'
import { memoryStore } from '../../tools/connect/store'

const KEY = 'k'.repeat(32)
const BASE = { CONNECT_PUBLIC_URL: 'https://connect-staging.example.workers.dev', CONNECT_ENCRYPTION_KEY: KEY, CONNECT_STATE_KEY: KEY, CONNECT_FAKE_PROVIDER: '1', CONNECT_ENV: 'staging' }
const noLog = () => {}
const build = (env: Record<string, string | undefined>, log: (line: string) => void = noLog) => connectFromWorkerEnv(env, memoryStore(), '1.2.3', log)

describe('connectFromWorkerEnv', () => {
  it('builds the broker and logs which providers it serves', async () => {
    const lines: string[] = []
    const handle = build(BASE, (line) => lines.push(line))
    const res = await handle(new Request('https://connect-staging.example.workers.dev/health'))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true, version: '1.2.3', services: ['github', 'jira', 'bitbucket'] })
    expect(lines).toEqual(['github: fake, jira: fake, bitbucket: fake'])
  })

  it('refuses to start without both secrets, naming the setting and never its value', () => {
    expect(() => build({ ...BASE, CONNECT_STATE_KEY: undefined })).toThrow(CloudConfigError)
    expect(() => build({ ...BASE, CONNECT_STATE_KEY: undefined })).toThrow(/CONNECT_STATE_KEY is not set/)
    expect(() => build({ ...BASE, CONNECT_ENCRYPTION_KEY: 'short-secret' })).toThrow(/at least 32/)
    expect(() => build({ ...BASE, CONNECT_ENCRYPTION_KEY: 'short-secret' })).not.toThrow(/short-secret/)
  })

  it('needs an https public address, or localhost for wrangler dev', () => {
    expect(() => build({ ...BASE, CONNECT_PUBLIC_URL: undefined })).toThrow(/CONNECT_PUBLIC_URL/)
    expect(() => build({ ...BASE, CONNECT_PUBLIC_URL: 'http://connect.example.com' })).toThrow(/CONNECT_PUBLIC_URL/)
    expect(() => build({ ...BASE, CONNECT_PUBLIC_URL: 'http://localhost:8789' })).not.toThrow()
  })

  it('answers only Figma on the public address, and also the dev harness on localhost', async () => {
    const keys = (url: string, origin: string) =>
      build({ ...BASE, CONNECT_PUBLIC_URL: url })(new Request(`${url}/auth/github/keys`, { method: 'POST', headers: { 'x-connect-client': 'bluebird', origin } }))
    expect((await keys(BASE.CONNECT_PUBLIC_URL, 'null')).status).toBe(200)
    expect((await keys(BASE.CONNECT_PUBLIC_URL, 'http://localhost:5173')).status).toBe(403)
    expect((await keys('http://localhost:8789', 'http://localhost:5173')).status).toBe(200)
  })

  it('keeps the fake provider out of production', () => {
    expect(() => build({ ...BASE, NODE_ENV: 'production' })).toThrow(/never in production/)
  })
})
