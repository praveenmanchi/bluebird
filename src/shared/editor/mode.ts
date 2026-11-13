// Which Figma editor the plugin runs in. Dev Mode opens the plugin in the Inspect panel
// with a read-only document: creating, deleting or editing layers throws there, while
// reading, plugin data and exportAsync still work. Sandbox-safe: no DOM, no signals.
import type { HandlerMap } from '@shared/bridge/sandbox-router'

export type EditorMode = 'design' | 'dev'

export const EDITOR_MSG = { mode: 'editor:mode' } as const

/** `figma.editorType` → the mode the UI cares about. Only Dev Mode is read-only. */
export function editorModeOf(editorType: string | undefined): EditorMode {
  return editorType === 'dev' ? 'dev' : 'design'
}

/** What a blocked action says, so every tab words it the same way. */
export const DEV_MODE_READ_ONLY = 'Dev Mode is read-only, so Bluebird can’t change the file here. Switch to Design Mode to do this.'

/**
 * Returns a copy of `handlers` where each listed message type answers with
 * DEV_MODE_READ_ONLY instead of touching the canvas. Design Mode gets the map back unchanged.
 */
export function guardCanvasWrites(handlers: HandlerMap, writeTypes: readonly string[], mode: EditorMode): HandlerMap {
  if (mode !== 'dev') return handlers
  const blocked = (): never => { throw new Error(DEV_MODE_READ_ONLY) }
  return Object.fromEntries(
    Object.entries(handlers).map(([type, handler]) => [type, writeTypes.includes(type) ? blocked : handler]),
  )
}
