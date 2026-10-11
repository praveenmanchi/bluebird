// Runs inside Figma. The handoff is UI-only for now; the real actions select and
// reveal the frame the handoff is about, and open the pull request or Jira issue.
import type { HandlerMap } from '@shared/bridge'
import { MSG, focusRequestSchema, openRequestSchema } from '../messages'

async function focus(payload: unknown): Promise<void> {
  const { nodeId } = focusRequestSchema.parse(payload)
  const node = await figma.getNodeByIdAsync(nodeId)
  if (!node || node.type === 'DOCUMENT' || node.type === 'PAGE') throw new Error('That frame no longer exists')
  figma.currentPage.selection = [node as SceneNode]
  figma.viewport.scrollAndZoomIntoView([node as SceneNode])
}

export const handlers: HandlerMap = {
  [MSG.focus]: focus,
  [MSG.open]: (payload: unknown) => { figma.openExternal(openRequestSchema.parse(payload).url) },
}
