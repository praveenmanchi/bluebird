// Runs inside Figma: wires the History handlers to clientStorage (Settings ›
// GitHub, Storage and Jira, and when History was last opened), Figma's fetch,
// the signed-in user and the clock.
import type { HandlerMap } from '@shared/bridge'
import { clientStorageRead, readIntegrations } from '@shared/integrations/effective'
import { createHistoryHandlers } from './history-handlers'

const SEEN_KEY = 'bluebird:history:seen'

function me(): string {
  try {
    return figma.currentUser?.name ?? ''
  } catch {
    return '' // currentUser throws where the permission is missing
  }
}

/** Live wiring. Building it touches nothing: `figma` is only read when a call arrives. */
export const handlers: HandlerMap = createHistoryHandlers({
  readGithub: async () => (await readIntegrations(clientStorageRead)).github,
  readStorage: async () => (await readIntegrations(clientStorageRead)).storage,
  readJira: async () => (await readIntegrations(clientStorageRead)).jira,
  seen: {
    get: async () => { const v = await figma.clientStorage.getAsync(SEEN_KEY); return typeof v === 'string' ? v : null },
    set: async (iso) => { await figma.clientStorage.setAsync(SEEN_KEY, iso) },
  },
  me,
  fetch: (url, init) => fetch(url, init),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  openExternal: (url) => figma.openExternal(url),
  now: () => new Date(),
})
