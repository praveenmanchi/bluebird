// Fixture handlers for browser-only development (?mode=mock) and UI tests.
// The library index (`libraries:load`) is the shell's; tests that need one pass
// `libraries`, which then answers here.
import type { HandlerMap } from '@shared/bridge'
import { LIBRARIES_MSG, type LibraryLoadResult } from '@shared/libraries'
import { MSG, openRequestSchema, type AskResult, type SelectionContext } from './messages'
import { MOCK_SELECTION } from './fixtures'

export interface UxaiMockOptions {
  /** What `libraries:load` answers; omitted, the handler is left to the shell's mock. */
  libraries?: LibraryLoadResult
  /** What the selection reads as; null = nothing selected. */
  selection?: SelectionContext | null
  onOpen?: (url: string) => void
  /** What `uxai:ask` answers; omitted, the model reads as not set up (no key). */
  ask?: (payload: unknown) => Promise<AskResult>
}

export function createMockHandlers({ libraries, selection = MOCK_SELECTION, onOpen, ask }: UxaiMockOptions = {}): HandlerMap {
  return {
    [MSG.focus]: async () => undefined,
    [MSG.selection]: async () => selection,
    [MSG.ask]: ask ?? (async (): Promise<AskResult> => ({ status: 'not-configured', reason: 'no-key' })),
    [MSG.open]: async (payload: unknown) => {
      const { url } = openRequestSchema.parse(payload)
      if (onOpen) onOpen(url)
      else if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener')
    },
    ...(libraries ? { [LIBRARIES_MSG.load]: async () => libraries } : {}),
  }
}

export const mockHandlers: HandlerMap = createMockHandlers()
