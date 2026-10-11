// Runs inside Figma. The agents themselves are UI fixtures for now; the only
// document access is selecting the layer a finding points at.
import type { HandlerMap } from '@shared/bridge'
import { MSG, focusRequestSchema } from '../messages'

async function focus(payload: unknown): Promise<void> {
  const { nodeId } = focusRequestSchema.parse(payload)
  const node = await figma.getNodeByIdAsync(nodeId)
  if (!node || node.type === 'DOCUMENT' || node.type === 'PAGE') throw new Error('Layer no longer exists')
  figma.currentPage.selection = [node as SceneNode]
  figma.viewport.scrollAndZoomIntoView([node as SceneNode])
}

export const handlers: HandlerMap = {
  [MSG.focus]: focus,
}
