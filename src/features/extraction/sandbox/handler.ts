// Runs inside Figma: wires the Extraction handlers (extraction-handlers.ts) to
// the document, clientStorage (Settings › Code repository and Notifications), Figma's
// fetch and the clock.
import type { HandlerMap } from '@shared/bridge'
import { clientStorageRead, readIntegrations } from '@shared/integrations/effective'
import { readSnapshot } from '@shared/figma/snapshot'
import { config } from '@shared/config'
import { PERSONA_KEY } from '@shared/session/persona-key'
import { createExtractionHandlers } from './extraction-handlers'

function userName(): string {
  try {
    return figma.currentUser?.name ?? 'Unknown'
  } catch {
    return 'Unknown' // currentUser throws where the permission is missing
  }
}

/** Live wiring. Building it touches nothing: `figma` is only read when a call arrives. */
export const handlers: HandlerMap = createExtractionHandlers({
  readSnapshot,
  readGithub: async () => (await readIntegrations(clientStorageRead)).github,
  readNotifications: async () => (await readIntegrations(clientStorageRead)).notifications,
  readStorage: async () => (await readIntegrations(clientStorageRead)).storage,
  fetch: (url, init) => fetch(url, init),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  openExternal: (url) => figma.openExternal(url),
  now: () => new Date(),
  user: userName,
  fileName: () => figma.root.name,
  team: async () => {
    const id = await figma.clientStorage.getAsync(PERSONA_KEY)
    return typeof id === 'string' ? config.personas[id]?.label ?? '' : ''
  },
})
