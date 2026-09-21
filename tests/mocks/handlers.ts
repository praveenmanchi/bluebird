// Aggregated fixture handlers for ?mode=mock. Each tab contributes its own
// mock.ts; this file only assembles them (it is the mock counterpart of the
// generated sandbox registry).
import type { HandlerMap } from '@shared/bridge'
import { mockHandlers as a11y } from '@features/a11y/mock'

const brandTokens: HandlerMap = {
  'brand:tokens': async () => ({
    brandId: 'bridge',
    source: 'fallback',
    tokens: {},
    note: 'Mock mode: no Figma document. Using generated tokens from figma/tokens.json.',
  }),
  'shell:close': async () => undefined,
}

export const mockHandlers: HandlerMap = { ...brandTokens, ...a11y }
