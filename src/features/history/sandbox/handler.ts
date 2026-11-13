// Runs inside Figma: wires the History handlers to clientStorage (Settings ›
// GitHub, Storage and Jira, and when History was last opened), Figma's fetch,
// the signed-in user and the clock.
import type { HandlerMap } from '@shared/bridge'
import { clientStorageRead, readIntegrations } from '@shared/integrations/effective'
import { readSnapshot } from '@shared/figma/snapshot'
import { config } from '@shared/config'
import { PERSONA_KEY } from '@shared/session/persona-key'
import { createHistoryHandlers } from './history-handlers'
import { createChangelogHandlers } from './changelog-handlers'
import { drawChangelogCard } from './changelog-canvas'
import { createVersionsHandlers } from './versions-handlers'

const SEEN_KEY = 'bluebird:history:seen'

function me(): string {
  try {
    return figma.currentUser?.name ?? ''
  } catch {
    return '' // currentUser throws where the permission is missing
  }
}

/** Live wiring. Building it touches nothing: `figma` is only read when a call arrives. */
const history: HandlerMap = createHistoryHandlers({
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

/** The changelog: compares the open branch with its main file, then saves, draws and approves it. */
const changelog: HandlerMap = createChangelogHandlers({
  readSnapshot,
  readDualFile: async () => (await readIntegrations(clientStorageRead)).dualFile,
  readGithub: async () => (await readIntegrations(clientStorageRead)).github,
  readStorage: async () => (await readIntegrations(clientStorageRead)).storage,
  readJira: async () => (await readIntegrations(clientStorageRead)).jira,
  readNotifications: async () => (await readIntegrations(clientStorageRead)).notifications,
  fetch: (url, init) => fetch(url, init),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now: () => new Date(),
  user: () => me() || 'Unknown',
  team: async () => {
    const id = await figma.clientStorage.getAsync(PERSONA_KEY)
    return typeof id === 'string' ? config.personas[id]?.label ?? '' : ''
  },
  fileKey: () => figma.fileKey ?? null,
  fileName: () => figma.root.name,
  pageName: () => figma.currentPage.name,
  drawCard: drawChangelogCard,
})

/** Versioning: the open file's Figma version history. */
const versions: HandlerMap = createVersionsHandlers({
  readDualFile: async () => (await readIntegrations(clientStorageRead)).dualFile,
  fetch: (url, init) => fetch(url, init),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now: () => new Date(),
  fileKey: () => figma.fileKey ?? null,
  fileName: () => figma.root.name,
})

export const handlers: HandlerMap = { ...history, ...changelog, ...versions }
