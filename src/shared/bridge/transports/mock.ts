import type { BridgeMessage } from '../messages'
import type { Transport } from '../transport'
import type { HandlerMap } from '../sandbox-router'
import { createRouter } from '../sandbox-router'

/**
 * Mock transport for browser-only development and tests.
 * Runs a real router in-process against fixture handlers, so the UI code path
 * is identical to production — only the "Figma" is fake.
 */
export function createMockTransport(handlers: HandlerMap, latencyMs = 120): Transport {
  const listeners = new Set<(m: BridgeMessage) => void>()
  const router = createRouter(handlers, (message) => {
    setTimeout(() => listeners.forEach((fn) => fn(message)), latencyMs)
  })
  return {
    send(message) { void router.handle(message) },
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
  }
}
