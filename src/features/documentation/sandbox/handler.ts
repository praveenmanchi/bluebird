// Runs inside Figma: wires the Documentation handlers (doc-handlers.ts) to the
// document, clientStorage (Settings › Jira), Figma's fetch and the clock.
import type { HandlerMap } from '@shared/bridge'
import { BUILD_VERSION } from '@shared/buildInfo'
import { clientStorageRead, readIntegrations } from '@shared/integrations/effective'
import { drawDocument, locate } from './canvas'
import { collectComponent } from './collect-component'
import { listPages, scanPages } from './collect-pages'
import { createDocumentationHandlers } from './doc-handlers'

/** Plugin-data key the generated doc is stored under, on the component it documents. */
const DOC_KEY = 'bluebird:doc'

/** Live wiring. Building it touches nothing: `figma` is only read when a call arrives. */
export const handlers: HandlerMap = createDocumentationHandlers({
  readSelection: async (withPreview) => {
    const node = figma.currentPage.selection[0]
    return node ? collectComponent(node, withPreview) : null
  },
  readComponent: async (nodeId) => {
    const node = await figma.getNodeByIdAsync(nodeId)
    return node && node.type !== 'DOCUMENT' && node.type !== 'PAGE' ? collectComponent(node, true) : null
  },
  stored: {
    get: async (nodeId) => (await figma.getNodeByIdAsync(nodeId))?.getPluginData(DOC_KEY) ?? '',
    set: async (nodeId, value) => { (await figma.getNodeByIdAsync(nodeId))?.setPluginData(DOC_KEY, value) },
  },
  listPages,
  scanPages,
  draw: drawDocument,
  locate,
  readJira: async () => (await readIntegrations(clientStorageRead)).jira,
  fetch: (url, init) => fetch(url, init),
  version: BUILD_VERSION,
  now: () => new Date(),
  user: () => figma.currentUser?.name ?? 'Unknown',
})
