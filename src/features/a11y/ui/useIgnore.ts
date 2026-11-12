import { useRpc } from '@shared/ui'
import { MSG } from '../messages'
import { ignored } from '../state'

export interface IgnoreBinding {
  /** When this finding was ignored, ISO, or undefined while it still counts. */
  at?: string
  /** What the card's `ignored` block shows; undefined while the finding counts. */
  ignoredCard?: { reason: string; onUndo: () => void }
  /** The card's Ignore action; undefined once it is ignored. */
  onIgnore?: () => void
}

const day = (iso: string): string => {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? 'an earlier scan' : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * Wire a card's Ignore / Restore to the record kept in the Figma document.
 *
 * The scanner infers some findings from layer names, so a wrong one has to be
 * correctable once rather than argued with on every scan. State lives in tab
 * state keyed by finding, so the counts above the list agree with the cards.
 */
export function useIgnore(key: string): IgnoreBinding {
  const rpc = useRpc()
  const at = ignored.value[key]

  const onIgnore = () => {
    rpc.call<{ at: string }>(MSG.ignore, { key })
      .then((r) => { ignored.value = { ...ignored.value, [key]: r.at } })
      .catch(() => undefined)
  }

  const onUndo = () => {
    const { [key]: _dropped, ...rest } = ignored.value
    ignored.value = rest
    rpc.call(MSG.unignore, { key }).catch(() => { ignored.value = { ...rest, [key]: at ?? new Date().toISOString() } })
  }

  if (at === undefined) return { onIgnore }
  return { at, ignoredCard: { reason: `Ignored on ${day(at)} — it does not count towards the totals.`, onUndo } }
}
