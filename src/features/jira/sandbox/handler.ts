// Runs inside Figma: wires the Jira handlers (jira-handlers.ts) to
// clientStorage, Figma's fetch and openExternal, plus the document-side
// helpers (focus, selection).
import type { HandlerMap } from '@shared/bridge'
import { clientStorageRead, readIntegrations } from '@shared/integrations/effective'
import { focusRequestSchema, type SelectionLink } from '../messages'
import { createJiraHandlers } from './jira-handlers'

async function focus(payload: unknown): Promise<void> {
  const { nodeId } = focusRequestSchema.parse(payload)
  const node = await figma.getNodeByIdAsync(nodeId)
  if (!node || node.type === 'DOCUMENT' || node.type === 'PAGE') throw new Error('That frame is not in this file')
  figma.currentPage.selection = [node as SceneNode]
  figma.viewport.scrollAndZoomIntoView([node as SceneNode])
}

/** The first selected layer, named the way a Figma Link Card shows it. Null when nothing is selected. */
async function figmaSelection(): Promise<SelectionLink | null> {
  const node = figma.currentPage.selection[0]
  if (!node) return null
  // figma.fileKey is only set for private / organisation plugins; without it there is no shareable URL.
  const url = figma.fileKey ? `https://www.figma.com/design/${figma.fileKey}/?node-id=${node.id.replace(':', '-')}` : null
  return { nodeId: node.id, frame: node.name, path: `${figma.root.name} › ${figma.currentPage.name}`, url }
}

/** Live wiring. Building it touches nothing: `figma` is only read when a call arrives. */
export const handlers: HandlerMap = createJiraHandlers({
  readSettings: async () => (await readIntegrations(clientStorageRead)).jira,
  fetch: (url, init) => fetch(url, init),
  openExternal: (url) => figma.openExternal(url),
  selection: figmaSelection,
  focus,
})
