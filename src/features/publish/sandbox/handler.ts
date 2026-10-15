// Runs inside Figma: wires the Publish handlers (publish-handlers.ts) to the
// document, clientStorage (Settings › GitHub), Figma's fetch and the clock.
import type { HandlerMap } from '@shared/bridge'
import { clientStorageRead, readIntegrations } from '@shared/integrations/effective'
import { createPublishHandlers } from './publish-handlers'
import { readSnapshot } from './snapshot'

/** Live wiring. Building it touches nothing: `figma` is only read when a call arrives. */
export const handlers: HandlerMap = createPublishHandlers({
  readSnapshot,
  readGithub: async () => (await readIntegrations(clientStorageRead)).github,
  readNotifications: async () => (await readIntegrations(clientStorageRead)).notifications,
  data: {
    get: (key) => figma.root.getPluginData(key),
    set: (key, value) => figma.root.setPluginData(key, value),
  },
  fetch: (url, init) => fetch(url, init),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  openExternal: (url) => figma.openExternal(url),
  now: () => new Date(),
})
