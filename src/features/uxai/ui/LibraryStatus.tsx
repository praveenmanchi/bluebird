import { LinkButton, Notice } from '@shared/ui'
import type { LibraryState } from '@shared/libraries'

export interface LibraryStatusProps {
  state: LibraryState
  /** Re-read the library files (Refresh / Try again). */
  onRefresh?: () => void
  now?: () => number
}

/** "just now" / "4 min ago" / "2 h ago". */
export function ago(then: number, now: number): string {
  const minutes = Math.floor((now - then) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  return `${Math.floor(minutes / 60)} h ago`
}

/** Where the Sources come from: the Dual File libraries (read when, Refresh), or why they're samples. */
export function LibraryStatus({ state, onRefresh, now = Date.now }: LibraryStatusProps) {
  switch (state.status) {
    case 'loading':
      return <p class="bb-uxai-caption" role="status">Reading your Dual File libraries… Large variable files can take 20 seconds.</p>
    case 'ready':
      return (
        <p class="bb-uxai-caption bb-uxai-library-status" role="status">
          {`From Settings › Dual File Mode · read ${ago(state.index.loadedAt, now())}`}
          {onRefresh && <LinkButton onClick={onRefresh}>Refresh</LinkButton>}
        </p>
      )
    case 'not-configured':
      return <Notice tone="info" title="No libraries connected">{`${state.message} Until then UX AI answers with sample data.`}</Notice>
    case 'error':
      return (
        <Notice tone="error" title="Couldn’t read your libraries">
          {state.message}{' '}
          {onRefresh && <LinkButton onClick={onRefresh}>Try again</LinkButton>}
        </Notice>
      )
  }
}
