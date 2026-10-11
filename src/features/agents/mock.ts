// Fixture handlers for browser-only development (?mode=mock) and UI tests.
import type { HandlerMap } from '@shared/bridge'
import { MSG, focusRequestSchema } from './messages'

export function createMockHandlers(): HandlerMap {
  return {
    [MSG.focus]: async (payload: unknown) => { focusRequestSchema.parse(payload) },
  }
}

export const mockHandlers: HandlerMap = createMockHandlers()
