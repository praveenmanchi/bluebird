// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { createConnect } from '../../tools/connect/app'
import { analyticsEngine, parseLoginEvent, type LoginEvent } from '../../tools/connect/events'
import { memoryStore } from '../../tools/connect/store'

const BASE = 'https://connect.example.com'
const KEY = 'k'.repeat(32)
const USER = 'a'.repeat(64)
const PLUGIN = { 'x-connect-client': 'bluebird', origin: 'null', 'content-type': 'application/json' }

function broker(options: { analytics?: boolean } = {}) {
  const events: LoginEvent[] = []
  const handle = createConnect({
    publicUrl: BASE, encryptionKey: KEY, stateKey: KEY, store: memoryStore(), providers: {}, version: 'test',
    clientIp: () => '203.0.113.9',
    ...(options.analytics === false ? {} : { analytics: { login: (event: LoginEvent) => { events.push(event) } } }),
  })
  const send = (body: unknown, headers: Record<string, string> = PLUGIN) =>
    handle(new Request(`${BASE}/events/login`, { method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body) }))
  return { events, send, handle }
}

describe('parseLoginEvent', () => {
  it('accepts a brand, a user key or null, and a version', () => {
    expect(parseLoginEvent(JSON.stringify({ brand: 'gap', user: USER, version: '1.3.143' }))).toEqual({ brand: 'gap', user: USER, version: '1.3.143' })
    expect(parseLoginEvent(JSON.stringify({ brand: 'ikea', user: null, version: '1.0.0' }))).toEqual({ brand: 'ikea', user: null, version: '1.0.0' })
  })

  it('refuses anything that could carry an access code, a name or free text', () => {
    for (const body of [
      { brand: 'GAP-2026', user: null, version: '1' },
      { brand: 'gap', user: 'praveen@example.com', version: '1' },
      { brand: 'gap', user: USER.slice(1), version: '1' },
      { brand: 'gap', user: null, version: 'v1 <script>' },
      { brand: 'gap', user: null },
    ]) expect(parseLoginEvent(JSON.stringify(body))).toBeNull()
    expect(parseLoginEvent('not json')).toBeNull()
    expect(parseLoginEvent(JSON.stringify({ brand: 'gap', user: null, version: '1', pad: 'x'.repeat(2_000) }))).toBeNull()
  })
})

describe('POST /events/login', () => {
  it('records the login with the user key pseudonymised by the server, never the key the plugin sent', async () => {
    const { events, send } = broker()
    const res = await send({ brand: 'gap', user: USER, version: '1.3.143' })
    expect(res.status).toBe(204)
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ brand: 'gap', version: '1.3.143' })
    expect(events[0]!.user).toMatch(/^[0-9a-f]{32}$/)
    expect(events[0]!.user).not.toContain(USER.slice(0, 32))
  })

  it('gives the same person the same id, and different people different ids', async () => {
    const { events, send } = broker()
    await send({ brand: 'gap', user: USER, version: '1' })
    await send({ brand: 'gap', user: USER, version: '1' })
    await send({ brand: 'gap', user: 'b'.repeat(64), version: '1' })
    expect(events[0]!.user).toBe(events[1]!.user)
    expect(events[2]!.user).not.toBe(events[0]!.user)
  })

  it('records a login without a user when Figma shares none', async () => {
    const { events, send } = broker()
    expect((await send({ brand: 'gap', user: null, version: '1' })).status).toBe(204)
    expect(events[0]!.user).toBeNull()
  })

  it('answers only the plugin', async () => {
    const { events, send } = broker()
    expect((await send({ brand: 'gap', user: null, version: '1' }, { ...PLUGIN, origin: 'https://evil.example' })).status).toBe(403)
    expect((await send({ brand: 'gap', user: null, version: '1' }, { origin: 'null', 'content-type': 'application/json' })).status).toBe(403)
    expect(events).toHaveLength(0)
  })

  it('refuses a malformed event and a GET', async () => {
    const { events, send, handle } = broker()
    expect((await send({ brand: 'GAP-2026' })).status).toBe(400)
    expect((await handle(new Request(`${BASE}/events/login`, { headers: PLUGIN }))).status).toBe(405)
    expect(events).toHaveLength(0)
  })

  it('rate-limits per IP', async () => {
    const { send } = broker()
    const statuses: number[] = []
    for (let i = 0; i < 35; i++) statuses.push((await send({ brand: 'gap', user: null, version: '1' })).status)
    expect(statuses.slice(0, 30).every((s) => s === 204)).toBe(true)
    expect(statuses.at(-1)).toBe(429)
  })

  it('refuses a brand the plugin build doesn’t have, when the broker knows the list', async () => {
    const events: LoginEvent[] = []
    const handle = createConnect({
      publicUrl: BASE, encryptionKey: KEY, stateKey: KEY, store: memoryStore(), providers: {}, version: 'test', clientIp: () => '203.0.113.9',
      analytics: { login: (event: LoginEvent) => { events.push(event) } }, analyticsBrands: ['gap', 'ikea'],
    })
    const send = (brand: string) => handle(new Request(`${BASE}/events/login`, { method: 'POST', headers: PLUGIN, body: JSON.stringify({ brand, user: null, version: '1' }) }))
    expect((await send('gap')).status).toBe(204)
    expect((await send('made-up-brand')).status).toBe(400)
    expect(events.map((e) => e.brand)).toEqual(['gap'])
  })

  it('accepts and drops events when no analytics are configured (local runs, a company gateway)', async () => {
    const { send } = broker({ analytics: false })
    expect((await send({ brand: 'gap', user: USER, version: '1' })).status).toBe(204)
  })
})

describe('analyticsEngine', () => {
  it('writes one data point per login, indexed by brand', () => {
    const points: unknown[] = []
    analyticsEngine({ writeDataPoint: (point) => { points.push(point) } }).login({ brand: 'gap', user: 'c'.repeat(32), version: '1.3.143', country: 'IN' })
    analyticsEngine({ writeDataPoint: (point) => { points.push(point) } }).login({ brand: 'ikea', user: null, version: '1', country: '' })
    expect(points).toEqual([
      { indexes: ['gap'], blobs: ['login', 'gap', 'c'.repeat(32), '1.3.143', 'IN'], doubles: [1] },
      { indexes: ['ikea'], blobs: ['login', 'ikea', '', '1', ''], doubles: [1] },
    ])
  })
})
