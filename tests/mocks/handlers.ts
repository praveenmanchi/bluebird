// Aggregated fixture handlers for ?mode=mock. Each tab contributes its own
// mock.ts; this file only assembles them (it is the mock counterpart of the
// generated sandbox registry).
import type { HandlerMap } from '@shared/bridge'
import { createMockHandlers as a11y, type MockScenario } from '@features/a11y/mock'

export interface MockOptions {
  scenario?: MockScenario
  brandId?: string
  /** Called for shell:resize; the dev harness resizes its iframe with it. */
  onResize?: (size: { width: number; height: number }) => void
}

export function createMockHandlers({ scenario = 'default', brandId = 'bridge', onResize }: MockOptions = {}): HandlerMap {
  const shell: HandlerMap = {
    'brand:tokens': async () => ({
      brandId,
      source: 'fallback',
      tokens: {},
      note: 'Mock mode: no Figma document. Using generated tokens from figma/tokens.json.',
    }),
    'shell:close': async () => undefined,
    'shell:resize': async (payload: { width: number; height: number }) => { onResize?.(payload) },
  }
  return { ...shell, ...a11y(scenario) }
}

export const mockHandlers: HandlerMap = createMockHandlers()
