// Fixture handlers for browser-only development (?mode=mock) and UI tests.
import type { HandlerMap } from '@shared/bridge'
import { MSG, openRequestSchema } from './messages'

export function createMockHandlers(): HandlerMap {
  return {
    [MSG.focus]: async () => undefined,
    [MSG.open]: async (payload: unknown) => {
      const { url } = openRequestSchema.parse(payload)
      if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener')
    },
  }
}

export const mockHandlers: HandlerMap = createMockHandlers()
