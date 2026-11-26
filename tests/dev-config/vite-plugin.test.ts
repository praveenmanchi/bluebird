// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { copyFileSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { Readable } from 'node:stream'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { devConfigPlugin } from '../../tools/dev-config/vite-plugin'
import type { BuildRunner, BuildState } from '../../tools/dev-config/build-runner'

type Middleware = (req: IncomingMessage, res: ServerResponse) => void

/** The plugin's middleware, registered against a fake dev server. */
function middlewares(configPath: string, build?: BuildRunner): Record<string, Middleware> {
  const handlers: Record<string, Middleware> = {}
  const server = { middlewares: { use: (path: string, fn: Middleware) => { handlers[path] = fn } }, config: { logger: { warn: () => undefined } } }
  ;(devConfigPlugin(configPath, build).configureServer as (s: unknown) => void)(server)
  return handlers
}
const middleware = (configPath: string): Middleware => middlewares(configPath)['/__bluebird/config']!

function request(handler: Middleware, method: string, body = '', headers: Record<string, string> = {}): Promise<{ status: number; json: { ok: boolean; error?: string; build?: BuildState; config?: { brand: { brands: Record<string, { tabs?: unknown }> } } } }> {
  const req = Object.assign(Readable.from(body ? [Buffer.from(body)] : []), { method, headers: { host: 'localhost:5173', ...headers } }) as unknown as IncomingMessage
  return new Promise((done) => {
    const res = { statusCode: 0, setHeader: () => undefined, end: (text: string) => done({ status: res.statusCode, json: JSON.parse(text) }) } as unknown as ServerResponse & { statusCode: number }
    handler(req, res)
  })
}

const json = { 'content-type': 'application/json', origin: 'http://localhost:5173' }
let file: string

beforeEach(() => {
  file = join(mkdtempSync(join(tmpdir(), 'bb-config-')), 'plugin.config.json')
  copyFileSync(resolve(process.cwd(), 'plugin.config.json'), file)
})

describe('dev config middleware', () => {
  it('serves the config and writes a valid patch to the file', async () => {
    const handler = middleware(file)
    expect((await request(handler, 'GET')).json.ok).toBe(true)
    const put = await request(handler, 'PUT', JSON.stringify({ ibm: { tabs: [{ id: 'publish', enabled: true }] } }), json)
    expect(put.status).toBe(200)
    expect(JSON.parse(readFileSync(file, 'utf8')).brand.brands.ibm.tabs).toEqual([{ id: 'publish', enabled: true }])
  })

  it('refuses other origins, non-JSON bodies, invalid configs and other methods, leaving the file alone', async () => {
    const handler = middleware(file)
    const before = readFileSync(file, 'utf8')
    expect((await request(handler, 'PUT', '{}', { ...json, origin: 'https://evil.example' })).status).toBe(403)
    expect((await request(handler, 'PUT', '{}', { origin: json.origin })).status).toBe(415)
    const bad = await request(handler, 'PUT', JSON.stringify({ ikea: { integrations: { jira: { apiKey: 'x' } } } }), json)
    expect(bad.status).toBe(400)
    expect(bad.json.error).toMatch(/keys and tokens/)
    expect((await request(handler, 'DELETE')).status).toBe(405)
    expect(readFileSync(file, 'utf8')).toBe(before)
  })

  it('starts one build at a time from this page only, and reports its state', async () => {
    let state: BuildState = { status: 'idle' }
    const runner: BuildRunner = { state: () => state, start: () => { if (state.status === 'running') return false; state = { status: 'running', startedAt: 'now', output: '' }; return true } }
    const handler = middlewares(file, runner)['/__bluebird/build']!
    expect((await request(handler, 'GET')).json.build).toEqual({ status: 'idle' })
    expect((await request(handler, 'POST', '{}', { ...json, origin: 'https://evil.example' })).status).toBe(403)
    expect((await request(handler, 'POST', '{}', { origin: json.origin })).status).toBe(415)
    expect(state.status).toBe('idle')
    expect((await request(handler, 'POST', '{}', json)).status).toBe(202)
    expect((await request(handler, 'POST', '{}', json))).toMatchObject({ status: 409, json: { error: 'A build is already running.' } })
    expect((await request(handler, 'PUT')).status).toBe(405)
  })

  it('starts the package script on request and refuses any other', async () => {
    const started: unknown[] = []
    const runner: BuildRunner = { state: () => ({ status: 'idle' }), start: (script) => { started.push(script); return true } }
    const handler = middlewares(file, runner)['/__bluebird/build']!
    expect((await request(handler, 'POST', JSON.stringify({ script: 'package' }), json)).status).toBe(202)
    expect((await request(handler, 'POST', JSON.stringify({ script: 'deploy' }), json))).toMatchObject({ status: 400, json: { error: 'Unknown script: use "build" or "package".' } })
    expect((await request(handler, 'POST', 'not json', json)).status).toBe(400)
    expect(started).toEqual(['package'])
  })

  it('writes the deployment to the file', async () => {
    const handler = middlewares(file)['/__bluebird/deploy']!
    const put = await request(handler, 'PUT', JSON.stringify({ deploy: { mode: 'single', brand: 'gap' }, figmaPlugin: { gap: { id: '1234567890123' } } }), json)
    expect(put.status).toBe(200)
    const stored = JSON.parse(readFileSync(file, 'utf8'))
    expect(stored.deploy).toEqual({ mode: 'single', brand: 'gap' })
    expect(stored.brand.brands.gap.figmaPlugin).toEqual({ id: '1234567890123' })
    expect((await request(handler, 'PUT', JSON.stringify({ deploy: { mode: 'single', brand: 'nike' } }), json)).status).toBe(400)
  })
})
