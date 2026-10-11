// Tab-local state. Nothing outside src/features/a11y reads or writes this.
import { signal } from '@preact/signals'
import type { ScanResult, ScanScope, ScanTarget } from './messages'
import { ALL_RULES, type RuleSet } from './rules'
import type { Platform } from './target'

export type LevelFilter = 'all' | 'AA' | 'AAA'

/** What the scan reads: the selection, or the whole page when nothing is selected (set from Ready to scan's target). */
export const scope = signal<ScanScope>('selection')
/** Whose target-size minimum applies: WCAG (web), Apple HIG (iOS) or Material (Android). */
export const platform = signal<Platform>('web')
export const level = signal<LevelFilter>('all')
export const scanning = signal(false)
export const visited = signal(0)
export const result = signal<ScanResult | null>(null)
export const error = signal<string | null>(null)
/** Which "What we check" rules are ticked; an unticked rule hides its findings. */
export const rules = signal<RuleSet>(ALL_RULES)
/** What a scan of the scope would read: undefined while reading, null when nothing is selected. */
export const target = signal<ScanTarget | null | undefined>(undefined)
/**
 * Annotation lifecycle per finding id. Lives here rather than on the result so
 * a re-render cannot lose it, and a re-scan deliberately clears it.
 */
export const annotations = signal<Record<string, 'queued' | 'placed'>>({})

export function reset(): void {
  scope.value = 'selection'
  platform.value = 'web'
  level.value = 'all'
  scanning.value = false
  visited.value = 0
  result.value = null
  error.value = null
  annotations.value = {}
  rules.value = ALL_RULES
  target.value = undefined
}
