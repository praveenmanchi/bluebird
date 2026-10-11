// Aggregated fixture handlers for ?mode=mock. Each tab contributes its own
// mock.ts; this file only assembles them (it is the mock counterpart of the
// generated sandbox registry).
import type { HandlerMap } from '@shared/bridge'
import { createMockHandlers as a11y, type MockScenario } from '@features/a11y/mock'
import { createMockHandlers as tokens } from '@features/tokens/mock'
import { createMockHandlers as jira } from '@features/jira/mock'
import { createLiveMockHandlers as jiraLive } from '@features/jira/mock-live'
import { createMockHandlers as mcp } from '@features/mcp/mock'
import { createMockHandlers as uxai } from '@features/uxai/mock'
import { createAskHandlers } from '@features/uxai/sandbox/ask'
import { createMockHandlers as agents } from '@features/agents/mock'
import { createMockHandlers as publish } from '@features/publish/mock'
import { config } from '@shared/config'
import { INTEGRATIONS_KEY, mergeIntegrations } from '@shared/integrations'
import { createSessionHandlers, type SessionStore } from '../../src/sandbox/session'
import { createIntegrationsHandlers } from '../../src/sandbox/integrations'
import { createOnboardingHandlers, ONBOARDING_KEY } from '../../src/sandbox/onboarding'
import { createLibrariesHandlers } from '@shared/libraries/handlers'
import { LIBRARIES_MSG } from '@shared/libraries/types'
import type { HttpFetch } from '@shared/libraries/rest'

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
  /** Whether the first-run tour is already done. Defaults to done in tests and to not-done in the persisted dev harness. */
  onboarded?: boolean
  /** Fetch for Dual File Mode's Figma REST calls. Defaults to the browser's in the dev harness; tests get none. */
  fetch?: HttpFetch
}

/** Tests never reach the network: a Dual File call without an injected fetch fails like an offline machine. */
const offline: HttpFetch = async () => { throw new Error('No network in tests') }

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

export function createMockHandlers({ scenario = 'default', brandId = 'bridge', sessionBrand, persist = false, onResize, onboarded = !persist, fetch }: MockOptions = {}): HandlerMap {
  const store = mockSessionStore(persist)
  if (onboarded) void store.set(ONBOARDING_KEY, { completedAt: new Date().toISOString(), skipped: false })
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
    ...createIntegrationsHandlers(store),
    ...createOnboardingHandlers(store),
    // Dual File Mode reads the real Figma REST API from the dev harness (api.figma.com allows any origin).
    // Dev builds and tests only, so the plugin bundle doesn't ship a second REST loader (the sandbox has it).
    ...(import.meta.env.DEV
      ? createLibrariesHandlers({
        readSettings: async () => mergeIntegrations(await store.get(INTEGRATIONS_KEY)).dualFile,
        fetch: fetch ?? (persist ? (url, init) => globalThis.fetch(url, init) : offline),
      })
      : { [LIBRARIES_MSG.load]: async () => ({ status: 'not-configured', reason: 'empty', message: 'Dual File Mode needs Figma: open the plugin there.' }) }),
  }
  // Jira answers from fixtures until the mock Settings hold a complete Jira connection; then it calls Jira
  // through the browser's fetch (use Settings › Proxy URL = http://localhost:8787 with `npm run jira:proxy`).
  // Dev builds only, so the plugin bundle doesn't ship a second Jira client.
  const jiraHandlers = import.meta.env.DEV && persist
    ? jiraLive({ readSettings: async () => mergeIntegrations(await store.get(INTEGRATIONS_KEY)).jira, fetch: (url, init) => globalThis.fetch(url, init) })
    : jira()
  // UX AI asks the real Claude API from the dev harness once Settings hold a Claude key (dev builds only).
  const uxaiHandlers = import.meta.env.DEV && persist
    ? { ...uxai(), ...createAskHandlers({ readSettings: async () => mergeIntegrations(await store.get(INTEGRATIONS_KEY)).ai, fetch: (url, init) => globalThis.fetch(url, init) }) }
    : uxai()
  return { ...shell, ...a11y(scenario), ...tokens(), ...jiraHandlers, ...mcp(), ...uxaiHandlers, ...agents(), ...publish(scenario) }
}

export const mockHandlers: HandlerMap = createMockHandlers()
