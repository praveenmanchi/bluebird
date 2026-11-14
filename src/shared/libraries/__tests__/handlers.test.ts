import { describe, it, expect } from 'vitest'
import { isMessageType } from '@shared/bridge/messages'
import { DEFAULT_INTEGRATIONS } from '@shared/integrations'
import { dualFileWith } from '@shared/integrations/testing'
import { createLibrariesHandlers } from '../handlers'
import { LIBRARIES_MSG, type LibraryLoadResult } from '../types'
import { fakeFigma } from './fixtures'

const ctx = {} as never

function setup(settings = dualFileWith([{ id: 'V', role: 'Variables' }], 't')) {
  const figma = fakeFigma()
  let current = settings
  const handlers = createLibrariesHandlers({ readSettings: async () => current, fetch: figma.fetch, now: () => 1 })
  const load = (payload?: unknown) => handlers[LIBRARIES_MSG.load]!(payload as never, ctx) as Promise<LibraryLoadResult>
  return { figma, load, handlers, set: (next: typeof settings) => { current = next } }
}

describe('libraries handlers', () => {
  it('loads once per configuration, again on refresh or when Settings change', async () => {
    const { figma, load, set } = setup()
    const [a, b] = await Promise.all([load(), load()])
    expect(a).toBe(b)
    expect(a.status).toBe('ready')
    const after = figma.calls.length
    await load()
    expect(figma.calls.length).toBe(after)
    await load({ refresh: true })
    expect(figma.calls.length).toBe(after * 2)
    set(dualFileWith(['V'], 't', { enabled: true }))
    await load()
    expect(figma.calls.length).toBeGreaterThan(after * 2)
  })

  it('answers not-configured without touching the network, and never returns a token', async () => {
    const { figma, load, set } = setup({ ...DEFAULT_INTEGRATIONS.dualFile, enabled: false })
    expect(await load()).toMatchObject({ status: 'not-configured', reason: 'disabled' })
    expect(figma.calls).toHaveLength(0)
    set(dualFileWith([{ id: 'V', role: 'Variables' }], 'secret-token'))
    expect(JSON.stringify(await load())).not.toContain('secret-token')
  })

  it('retries a load whose files failed instead of caching the failure', async () => {
    let online = false
    const figma = fakeFigma()
    const handlers = createLibrariesHandlers({
      readSettings: async () => (dualFileWith([{ id: 'V', role: 'Variables' }], 't')),
      fetch: async (url, init) => { if (!online) throw new Error('offline'); return figma.fetch(url, init) },
    })
    const load = () => handlers[LIBRARIES_MSG.load]!(undefined as never, ctx) as Promise<LibraryLoadResult>
    const first = await load()
    expect(first.status === 'ready' && first.index.files[0]!.error).toContain('api.figma.com')
    online = true
    const second = await load()
    expect(second.status === 'ready' && second.index.files[0]!.error).toBeUndefined()
  })

  it('registers only message types the bridge accepts', () => {
    expect(Object.keys(setup().handlers).filter((type) => !isMessageType(type))).toEqual([])
  })

  it('wires Test connection on dual-file:test', async () => {
    const { handlers } = setup()
    const result = await handlers["dual-file:test"]!(dualFileWith([{ id: 'V', role: 'Variables' }], 't') as never, ctx)
    expect((result as { message: string }).message).toContain('5 variables')
  })
})
