// Tab-local state. Nothing outside src/features/a11y reads or writes this.
import { signal } from '@preact/signals'
import type { ScanResult, ScanScope } from './messages'

export type LevelFilter = 'all' | 'AA' | 'AAA'

export const scope = signal<ScanScope>('selection')
export const level = signal<LevelFilter>('all')
export const scanning = signal(false)
export const visited = signal(0)
export const result = signal<ScanResult | null>(null)
export const error = signal<string | null>(null)
/**
 * Annotation lifecycle per finding id. Lives here rather than on the result so
 * a re-render cannot lose it, and a re-scan deliberately clears it.
 */
export const annotations = signal<Record<string, 'queued' | 'placed'>>({})

export function reset(): void {
  scope.value = 'selection'
  level.value = 'all'
  scanning.value = false
  visited.value = 0
  result.value = null
  error.value = null
  annotations.value = {}
}
