// UI side of the editor mode: one signal the shell sets at boot and any tab can read,
// so actions that write to the canvas can step aside in Dev Mode.
import { computed, signal } from '@preact/signals'
import type { RpcClient } from '@shared/bridge'
import { EDITOR_MSG, type EditorMode } from './mode'

export { EDITOR_MSG, DEV_MODE_READ_ONLY, editorModeOf, guardCanvasWrites, type EditorMode } from './mode'

/** Design Mode until the sandbox says otherwise; an older sandbox or the dev harness never does. */
export const editorMode = signal<EditorMode>('design')
export const inDevMode = computed(() => editorMode.value === 'dev')

/** Asks the sandbox which editor it runs in. A failed ask keeps Design Mode: the sandbox still guards writes. */
export async function loadEditorMode(client: RpcClient): Promise<EditorMode> {
  try {
    const mode = await client.call<EditorMode>(EDITOR_MSG.mode)
    editorMode.value = mode === 'dev' ? 'dev' : 'design'
  } catch {
    editorMode.value = 'design'
  }
  return editorMode.value
}
