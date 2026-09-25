// Where component source lives, and how to walk it.
//
// Shared by the drift gate (check-tokens.ts) and the drift report (figma-diff.ts):
// both need the same answer to "which files consume tokens?", and when the two
// lists disagreed, a directory could pass one and be invisible to the other.
import { readdirSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

/** Directories whose files may read `var(--bb-…)`. Adding one puts it under the
 *  no-raw-values and unknown-token rules, so keep it to hand-written component source. */
export const COMPONENT_DIRS = ['src/shared/ui', 'src/shell', 'src/features']

/** Every file under `dir`, skipping `generated/` — those are the generator's own
 *  output, where raw values are the point. */
export function walkFiles(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    if (entry === 'generated') continue
    if (statSync(p).isDirectory()) walkFiles(p, out)
    else out.push(p)
  }
  return out
}
