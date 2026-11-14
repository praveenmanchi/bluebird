import type { RefObject } from 'preact'
import { useEffect } from 'preact/hooks'

/** Closes a menu on a press outside `root` or on Escape, while it is open. */
export function useDismiss(root: RefObject<HTMLElement>, open: boolean, close: () => void): void {
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) close() }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [root, open, close])
}
