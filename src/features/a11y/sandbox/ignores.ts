// Where ignored findings live: the Figma document itself, so the whole team sees
// the same corrections and a re-scan does not bring them back. Runs inside Figma.
import { parseIgnores, type IgnoreRecord } from '../ignore'

const KEY = 'bluebird:a11y:ignored'

export function readIgnores(): IgnoreRecord[] {
  return parseIgnores(figma.root.getPluginData(KEY) || '[]')
}

export function writeIgnores(records: readonly IgnoreRecord[]): void {
  figma.root.setPluginData(KEY, JSON.stringify(records))
}
