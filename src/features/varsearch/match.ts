// Pure matching rules shared by the sandbox scan and the mock.
import type { VariableMatch } from './messages'

/** Case-insensitive substring match on the full variable path. */
export function matcherFor(query: string): (name: string) => boolean {
  const q = query.trim().toLowerCase()
  return (name) => name.toLowerCase().includes(q)
}

/** Exact name first, then the most-used, then alphabetical. */
export function rankVariables(query: string, vars: readonly VariableMatch[]): VariableMatch[] {
  const q = query.trim().toLowerCase()
  return [...vars].sort((a, b) =>
    Number(b.name.toLowerCase() === q) - Number(a.name.toLowerCase() === q) || b.totalNodes - a.totalNodes || a.name.localeCompare(b.name))
}
