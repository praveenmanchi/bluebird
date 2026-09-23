import { useRpc } from '@shared/ui'
import { MSG } from '../messages'
import { annotations } from '../state'

export interface AnnotateBinding {
  annotation: { state: 'none' | 'queued' | 'placed'; target: string }
  onAnnotate: () => void
}

/**
 * Wire a card's Annotation button to Figma's Dev Mode annotations.
 *
 * The state lives in tab state keyed by finding, so every card that shares a
 * finding reports the same thing and a re-render cannot lose it. A failure
 * rolls the state back rather than leaving a button stuck on "Annotating…".
 */
export function useAnnotate(id: string, nodeIds: readonly string[], label: string): AnnotateBinding {
  const rpc = useRpc()
  const state = annotations.value[id] ?? 'none'

  const onAnnotate = () => {
    if (state === 'queued') return
    annotations.value = { ...annotations.value, [id]: 'queued' }
    rpc.call(MSG.annotate, { nodeIds, label })
      .then(() => { annotations.value = { ...annotations.value, [id]: 'placed' } })
      .catch(() => {
        const { [id]: _dropped, ...rest } = annotations.value
        annotations.value = rest
      })
  }

  return { annotation: { state, target: 'Dev Mode' }, onAnnotate }
}
