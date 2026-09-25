// Tab-local state. Nothing outside src/features/tokens reads or writes this.
import { signal } from '@preact/signals'
import type { AuditResult, AuditScope } from './messages'

export const scope = signal<AuditScope>('page')
export const auditing = signal(false)
export const visited = signal(0)
export const result = signal<AuditResult | null>(null)
export const error = signal<string | null>(null)

export function reset(): void {
  scope.value = 'page'
  auditing.value = false
  visited.value = 0
  result.value = null
  error.value = null
}
