// The local Figma → code sync: what the scheduled GitHub job would do, on this machine.
//
//   npm run figma:sync                 # read-only: what moved in Figma, written to figma/sync-report.md
//   npm run figma:sync -- --notify     # the same, plus a macOS notification when something moved
//   npm run figma:sync -- --apply      # accept the changed components into figma/components.json,
//                                      # regenerate the tokens, then run the drift gate and the tests
//
// It pulls over REST (FIGMA_TOKEN in .env), so it needs neither the relay nor Figma open.
//
// Two comparisons, because the committed snapshot usually comes from the plugin extractor and the
// two extractors describe layers differently (see figma-diff layerDiffBlocker):
//   1. live vs committed      sets, variants, component properties and, when the token can read
//                             them, variables. Accurate across extractors.
//   2. live vs REST baseline  layers, bindings, geometry and icons. The baseline is the previous
//                             REST pull, kept in figma/.rest-baseline.json (git-ignored), so both
//                             sides come from the same extractor and every finding is a design change.
// The baseline is taken again whenever figma/components.json changes, which is what accepting a
// pull does. Until then a finding is repeated on every run.
//
// Exit codes: 0 = in sync · 1 = Figma moved (or --apply left the gate or tests failing) · 2 = the pull failed.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { mergeCommitted, pullSnapshot, readCommitted, ROOT, type Snapshot } from './figma-pull'
import { diffSnapshots, formatFinding, type DriftFinding } from './figma-diff'
import type { ComponentSetSnapshot, ComponentsSnapshot, IconsSnapshot } from '../src/shared/brand/snapshot'

const BASELINE = 'figma/.rest-baseline.json'
const REPORT = 'figma/sync-report.md'
const LAYER_KINDS: ReadonlySet<string> = new Set(['node-added', 'node-removed', 'node-renamed', 'binding-added', 'binding-removed', 'binding-rebound', 'raw-changed', 'derived-added', 'derived-removed', 'derived-changed', 'icon-added', 'icon-removed', 'icon-changed'])
/** Findings --apply cannot accept by replacing or adding one set: they need the manifest or a full pull. */
const NEEDS_PULL: ReadonlySet<string> = new Set(['set-removed', 'set-id-changed', 'icon-added', 'icon-removed', 'icon-changed'])

export interface Baseline {
  /** sha256 of figma/components.json when the baseline was taken. */
  committedHash: string
  takenAt: string
  components: ComponentsSnapshot
  icons: IconsSnapshot
}

export interface SyncResult {
  findings: DriftFinding[]
  /** True when the baseline was (re)taken this run, so layers were not compared. */
  baselineReset: boolean
  baseline: Baseline
}

export const hashOf = (text: string) => createHash('sha256').update(text).digest('hex')

/** Compare a live REST pull with the committed snapshot and with the previous REST pull. */
export function compare(committed: Snapshot, live: Snapshot, baseline: Baseline | undefined, committedHash: string, now: string, root = ROOT): SyncResult {
  const setLevel = diffSnapshots(committed, live, root).filter((f) => !LAYER_KINDS.has(f.kind))
  if (!baseline || baseline.committedHash !== committedHash) {
    return { findings: setLevel, baselineReset: true, baseline: { committedHash, takenAt: now, components: live.components, icons: live.icons } }
  }
  const before: Snapshot = { tokens: live.tokens, components: baseline.components, icons: baseline.icons, source: 'figma-rest' }
  const layers = diffSnapshots(before, { ...live, source: 'figma-rest', bindingsUnnamed: false }, root).filter((f) => LAYER_KINDS.has(f.kind))
  return { findings: [...setLevel, ...layers], baselineReset: false, baseline }
}

/** The committed components with every named set replaced by its live version, and named sets the
 *  committed file does not have yet (new in figma/manifest.json) appended. Descriptions and the
 *  code-side bookkeeping stay: the REST API returns neither. */
export function spliceSets(committed: ComponentsSnapshot, live: ComponentsSnapshot, codes: ReadonlySet<string>): ComponentsSnapshot {
  const liveByCode = new Map(live.sets.map((s) => [s.code, s]))
  const sets = committed.sets.map((prev): ComponentSetSnapshot => {
    const next = codes.has(prev.code) ? liveByCode.get(prev.code) : undefined
    if (!next) return prev
    return { ...next, description: next.description || prev.description, ...(prev.status ? { status: prev.status } : {}), ...(prev.aliasOf ? { aliasOf: prev.aliasOf } : {}), ...(prev.dir ? { dir: prev.dir } : {}), ...(prev.css ? { css: prev.css } : {}) }
  })
  const known = new Set(committed.sets.map((s) => s.code))
  const added = live.sets.filter((s) => codes.has(s.code) && !known.has(s.code))
  return { ...committed, sets: [...sets, ...added] }
}

export function renderReport(result: SyncResult, live: Snapshot, now: string): string {
  const { findings } = result
  const out = [`# Figma sync report`, '', `Run ${now} over REST.`, '']
  if (live.tokensStale) out.push('- Variables were NOT checked: the token cannot read them (it needs the `file_variables:read` scope).')
  if (result.baselineReset) out.push('- Layers were not compared this run: the baseline was taken now, because `figma/components.json` changed or this is the first run.')
  if (!findings.length) return [...out, '', 'Figma and the snapshot agree.', ''].join('\n')
  const components = [...new Set(findings.flatMap((f) => (f.component ? [f.component] : [])))].sort()
  out.push('', `**${findings.length} change(s)** in ${components.length} component(s): ${components.join(', ') || 'none'}.`, '')
  const tokens = findings.filter((f) => f.scope === 'tokens')
  if (tokens.length) out.push('## Variables', '', '```', ...tokens.map(formatFinding), '```', '')
  for (const code of components) {
    const list = findings.filter((f) => f.component === code)
    out.push(`## ${code}`, '', ...(list[0]?.files?.length ? [`Files: ${list[0].files.map((f) => `\`${f}\``).join(', ')}`, ''] : []), '```', ...list.map(formatFinding), '```', '')
  }
  const icons = findings.filter((f) => f.scope === 'icons')
  if (icons.length) out.push('## Icons', '', `${icons.length} changed: ${icons.map((f) => f.key).join(', ')}`, '')
  out.push('Accept with `npm run figma:sync -- --apply`, or pull through the plugin with `npm run figma:pull`.', '')
  return out.join('\n')
}

function notify(title: string, message: string) {
  if (process.platform !== 'darwin') return
  spawnSync('osascript', ['-e', `display notification ${JSON.stringify(message)} with title ${JSON.stringify(title)}`])
}

function run(script: string): boolean {
  console.log(`[figma:sync] npm run ${script}`)
  return spawnSync('npm', ['run', '--silent', script], { cwd: ROOT, stdio: 'inherit' }).status === 0
}

const writeJson = (rel: string, data: unknown) => writeFileSync(resolve(ROOT, rel), `${JSON.stringify(data, null, 2)}\n`)

function apply(result: SyncResult, committed: Snapshot, live: Snapshot, now: string): boolean {
  const left = result.findings.filter((f) => NEEDS_PULL.has(f.kind) || f.scope === 'tokens')
  const codes = new Set(result.findings.filter((f) => f.component && !NEEDS_PULL.has(f.kind)).map((f) => f.component!))
  if (!codes.size) { console.log('[figma:sync] nothing --apply can accept.'); return left.length === 0 }
  const components = spliceSets(committed.components, live.components, codes)
  writeJson('figma/components.json', components)
  // The accepted sets move into the baseline; anything left over is reported again next run.
  const text = readFileSync(resolve(ROOT, 'figma/components.json'), 'utf8')
  writeJson(BASELINE, { committedHash: hashOf(text), takenAt: now, components: spliceSets(result.baseline.components, live.components, codes), icons: result.baseline.icons } satisfies Baseline)
  console.log(`[figma:sync] accepted ${[...codes].sort().join(', ')} into figma/components.json`)
  if (left.length) console.warn(`[figma:sync] ${left.length} change(s) need a full pull (new or removed sets, icons, variables): npm run figma:pull`)
  const ok = [run('gen:tokens'), run('tokens:check'), run('test')].every(Boolean)
  console.log(ok ? '[figma:sync] the code already follows the new snapshot. Review the diff and commit.' : '[figma:sync] the drift gate or the tests failed: update the components named above, then commit.')
  return ok && left.length === 0
}

async function main() {
  const argv = process.argv.slice(2)
  const now = new Date().toISOString()
  const committed = readCommitted()
  let live: Snapshot
  try {
    live = mergeCommitted(await pullSnapshot({ backend: 'rest', timeoutMs: 5_000 }))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[figma:sync] pull failed: ${message}`)
    if (argv.includes('--notify')) notify('Figma sync failed', message.slice(0, 180))
    process.exit(2)
  }
  const baselinePath = resolve(ROOT, BASELINE)
  const baseline = existsSync(baselinePath) ? (JSON.parse(readFileSync(baselinePath, 'utf8')) as Baseline) : undefined
  const committedHash = hashOf(readFileSync(resolve(ROOT, 'figma/components.json'), 'utf8'))
  const result = compare(committed, live, baseline, committedHash, now)
  if (result.baselineReset) writeJson(BASELINE, result.baseline)

  const report = renderReport(result, live, now)
  writeFileSync(resolve(ROOT, REPORT), report)
  console.log(report)
  console.log(`[figma:sync] ${result.findings.length} change(s) · report in ${REPORT}`)
  if (!result.findings.length) process.exit(0)
  if (argv.includes('--notify')) {
    const names = [...new Set(result.findings.flatMap((f) => (f.component ? [f.component] : [])))]
    notify('Figma moved', `${result.findings.length} change(s)${names.length ? ` in ${names.slice(0, 4).join(', ')}${names.length > 4 ? '…' : ''}` : ''}. See ${REPORT}.`)
  }
  if (!argv.includes('--apply')) process.exit(1)
  process.exit(apply(result, committed, live, now) ? 0 : 1)
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  main().catch((error) => { console.error(error); process.exit(2) })
}
