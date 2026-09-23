// Aggregated fixture handlers for ?mode=mock. Each tab contributes its own
// mock.ts; this file only assembles them (it is the mock counterpart of the
// generated sandbox registry).
import type { HandlerMap } from '@shared/bridge'
import { createMockHandlers as a11y, type MockScenario } from '@features/a11y/mock'
import { createMockHandlers as tokens } from '@features/tokens/mock'
import { config } from '@shared/config'
import { createSessionHandlers, type SessionStore } from '../../src/sandbox/session'

export interface MockOptions {
  scenario?: MockScenario
  /** Brand to report from brand:tokens when no session brand is given. */
  brandId?: string
  /** Pre-unlocked brand (dev harness "Session" knob); omit to start on the login screen. */
  sessionBrand?: string | null
  /** Persist the mock session across reloads (dev harness); tests keep it in memory. */
  persist?: boolean
  /** Called for shell:resize; the dev harness resizes its iframe with it. */
  onResize?: (size: { width: number; height: number }) => void
}

/** In-memory (or localStorage-backed) stand-in for figma.clientStorage. */
export function mockSessionStore(persist = false): SessionStore {
  const memory = new Map<string, unknown>()
  const storage = persist && typeof localStorage !== 'undefined' ? localStorage : null
  const prefix = 'bb-mock:'
  return {
    get: async (k) => storage ? JSON.parse(storage.getItem(prefix + k) ?? 'null') as unknown : memory.get(k),
    set: async (k, v) => { if (storage) storage.setItem(prefix + k, JSON.stringify(v)); else memory.set(k, v) },
    delete: async (k) => { if (storage) storage.removeItem(prefix + k); else memory.delete(k) },
    keys: async () => storage ? Object.keys(storage).filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length)) : [...memory.keys()],
  }
}

export function createMockHandlers({ scenario = 'default', brandId = 'bridge', sessionBrand, persist = false, onResize }: MockOptions = {}): HandlerMap {
  const store = mockSessionStore(persist)
  if (sessionBrand !== undefined) {
    if (sessionBrand) void store.set('bluebird:session', { brandId: sessionBrand, since: new Date().toISOString() })
    else void store.delete('bluebird:session')
  }
  const shell: HandlerMap = {
    'brand:tokens': async (payload?: { brandId?: string }) => ({
      brandId: payload?.brandId ?? brandId,
      source: 'fallback',
      tokens: {},
      note: 'Mock mode: no Figma document. Using generated tokens from figma/tokens.json.',
    }),
    'shell:close': async () => undefined,
    'shell:resize': async (payload: { width: number; height: number }) => { onResize?.(payload) },
    ...createSessionHandlers(config, store),
  }
  return { ...shell, ...a11y(scenario), ...tokens() }
}

export const mockHandlers: HandlerMap = createMockHandlers()
