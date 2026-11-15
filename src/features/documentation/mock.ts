// Fixture handlers for browser-only development (?mode=mock), stories and UI
// tests. They run the real handlers (doc-handlers.ts) over sample data, so the
// rules — fingerprints, audit, hand-off — are the ones the plugin ships.
import type { HandlerMap } from '@shared/bridge'
import { BUTTON, BUTTON_CHANGED, PAGES, SCANS, TICKETS } from './fixtures'
import { createDocumentationHandlers } from './sandbox/doc-handlers'
import { MSG, type TicketsResult } from './messages'

/** Matches the dev harness "data" knob. `empty` = nothing selected and no pages; `many` = the component changed after its doc. */
export type MockScenario = 'default' | 'empty' | 'many' | 'slow' | 'error'

export interface DocumentationMockOptions {
  scenario?: MockScenario
  /** Jira is not set up in Settings. */
  noJira?: boolean
  /** Delay before generate and hand-off answer; tests pass 0. */
  delayMs?: number
}

export const GENERATE_FAILED_MESSAGE = 'button/primary/height-lg has no value in the Ikea mode, so brand differences stopped. Add the value in Brand UI or leave that section out.'

const wait = (ms: number) => ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve()

export function createMockHandlers(options: DocumentationMockOptions | MockScenario = {}): HandlerMap {
  const { scenario = 'default', noJira = false, delayMs = 600 } = typeof options === 'string' ? { scenario: options } : options
  const store = new Map<string, string>()
  const pause = () => wait(scenario === 'slow' ? 3000 : delayMs)
  let located: string | null = null
  let generated = 0

  const real = createDocumentationHandlers({
    readSelection: async () => scenario === 'empty' ? null : scenario === 'many' && generated > 0 ? BUTTON_CHANGED : BUTTON,
    readComponent: async () => {
      await pause()
      if (scenario === 'error') throw new Error(GENERATE_FAILED_MESSAGE)
      generated += 1
      return BUTTON
    },
    stored: { get: async (id) => store.get(id) ?? '', set: async (id, value) => { store.set(id, value) } },
    listPages: async () => scenario === 'empty' ? [] : [...PAGES],
    scanPages: async (ids) => { await pause(); return ids.flatMap((id) => SCANS[id] ? [SCANS[id]!] : []) },
    draw: async (page) => `mock-frame:${page.frameName}`,
    locate: async (nodeId) => { located = nodeId },
    readJira: async () => { throw new Error('The mock answers Jira from fixtures.') },
    fetch: async () => { throw new Error('No network in the mock.') },
    version: 'V1.3.36',
    now: () => new Date(),
    user: () => 'Praveen Manchi',
  })

  return {
    ...real,
    [MSG.tickets]: async (): Promise<TicketsResult> => noJira ? { connected: false, problem: 'Connect Jira in Settings › Jira integration to pick a ticket.' } : { connected: true, tickets: TICKETS },
    [MSG.post]: async (payload: { key: string }) => { await pause(); return { key: payload.key } },
    /** Test hook: the last node Locate was asked for. */
    'documentation:mock-located': async () => located,
  }
}

export const mockHandlers: HandlerMap = createMockHandlers()
