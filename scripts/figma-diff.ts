// What changed in Figma since the last `npm run figma:pull`?
//
//   npm run figma:diff                        # plugin backend (relay + bridge page open)
//   npm run figma:diff -- --rest              # REST backend (FIGMA_TOKEN)
//   npm run figma:diff -- --component WcagCard --component Button
//   npm run figma:diff -- --json              # DriftReport on stdout, no human report
//   npm run figma:diff -- --fail-on-drift     # exit 1 when anything drifted (CI)
//
// Pulls into memory and NEVER writes figma/*.json — the committed snapshot stays the
// baseline until you accept it with `npm run figma:pull`. Writes figma/drift.json.
//
// Exit codes: 0 = no drift (or drift without --fail-on-drift) · 1 = drift with
// --fail-on-drift · 2 = the pull itself failed. CI must not call a dead relay "drift".
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve, relative } from 'node:path'
import { mergeCommitted, pullSnapshot, readCommitted, readManifest, ROOT, type Backend, type Snapshot } from './figma-pull'
import { derivedDeclarations, normalizeSvg } from './gen-tokens'
import { cssVarName, brandIdFromMode, type ComponentSetSnapshot, type ComponentVariant, type ComponentsSnapshot, type TokenSnapshot } from '../src/shared/brand/snapshot'
import { tokenKeyFromVariableName } from '../src/shared/brand/tokens'
import { matchNodes } from './figma-diff-nodes'
import { COMPONENT_DIRS, walkFiles } from './component-sources'

export type DriftKind =
  | 'variable-added' | 'variable-removed' | 'variable-changed' | 'mode-added' | 'mode-removed'
  | 'set-added' | 'set-removed' | 'set-renamed' | 'set-id-changed'
  | 'variant-added' | 'variant-removed'
  | 'prop-added' | 'prop-removed' | 'prop-renamed' | 'prop-type-changed' | 'prop-default-changed'
  | 'node-added' | 'node-removed' | 'node-renamed'
  | 'binding-added' | 'binding-removed' | 'binding-rebound' | 'raw-changed'
  | 'derived-added' | 'derived-removed' | 'derived-changed'
  | 'icon-added' | 'icon-removed' | 'icon-changed'

export interface DriftFinding {
  kind: DriftKind
  /** Stable across runs: "<kind>:<scope>:<key>". */
  id: string
  scope: 'tokens' | 'component' | 'icons'
  component?: string
  variant?: string
  path?: string
  key: string
  before?: unknown
  after?: unknown
  /** Generated CSS vars this lands on. */
  vars?: string[]
  /** Files a human must edit. */
  files?: string[]
  /** Whether the component CSS already reads `vars`. */
  read?: boolean
  confidence?: 'exact' | 'heuristic'
}

export interface DriftReport {
  generatedAt: string
  backend: Backend | 'none'
  tokensStale?: boolean
  /** Set when the two snapshots cannot be compared below set level; the reason is for the reader. */
  layerDiffSkipped?: string
  baseline: { pulledAt: string; fileKey: string }
  live: { pulledAt: string }
  counts: Partial<Record<DriftKind, number>>
  findings: DriftFinding[]
}

// Never diffed, or every run reports the tool's own bookkeeping as design drift:
//   pulledAt · fileName · source          re-stamped on every pull
//   components.coverage                   recomputed by extract.ts from the live layer counts
//   set.status / aliasOf / dir            code-side, restored by mergeCommitted()
//   tiers · standaloneIcons               code-side, restored by mergeCommitted()
//   variant.id                            re-created variants get fresh ids; nothing references them
// set.id IS diffed — figma.ts `setId` and figma/manifest.json both point at it.

// ------------------------------------------------------------------ helpers

const round = (n: number) => Math.round(n * 1000) / 1000
const norm = (v: unknown): unknown => (typeof v === 'number' ? round(v) : Array.isArray(v) ? v.map(norm) : v)
const same = (a: unknown, b: unknown) => JSON.stringify(norm(a)) === JSON.stringify(norm(b))
const variantKey = (v: ComponentVariant) => Object.entries(v.props).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => `${k}=${x}`).join(', ') || v.name
const derivedPrefix = (code: string) => `--bb-derived-${tokenKeyFromVariableName(code.replace(/([a-z])([A-Z])/g, '$1-$2'))}-`

function cssFileFor(set: ComponentSetSnapshot, root: string): string {
  return set.dir ? resolve(root, set.dir, `${set.code}.css`) : resolve(root, 'src/shared/ui', set.code, `${set.code}.css`)
}

/** Every `var(--bb-…)` any component reads, so a finding can say whether the change reaches code. */
function readVars(root: string): Set<string> {
  const out = new Set<string>()
  for (const dir of COMPONENT_DIRS) {
    for (const file of walkFiles(resolve(root, dir))) {
      for (const m of readFileSync(file, 'utf8').matchAll(/var\((--bb-[a-z0-9-]+)/g)) out.add(m[1]!)
    }
  }
  return out
}

// --------------------------------------------------------------------- diff

function diffTokens(before: TokenSnapshot, after: TokenSnapshot, used: Set<string>): DriftFinding[] {
  const out: DriftFinding[] = []
  const add = (f: Omit<DriftFinding, 'id' | 'scope'>) => out.push({ ...f, scope: 'tokens', id: `${f.kind}:tokens:${f.key}` })
  const afterByKey = new Map(after.collections.map((c) => [c.key, c]))
  for (const b of before.collections) {
    const a = afterByKey.get(b.key)
    if (!a) continue
    for (const mode of b.modes) if (!a.modes.includes(mode)) add({ kind: 'mode-removed', key: `${b.key}/${mode}`, before: mode, files: [`src/shared/brand/generated/brand.${brandIdFromMode(mode)}.css`] })
    for (const mode of a.modes) if (!b.modes.includes(mode)) add({ kind: 'mode-added', key: `${b.key}/${mode}`, after: mode, files: [`src/shared/brand/generated/brand.${brandIdFromMode(mode)}.css`] })

    const beforeVars = new Map(b.variables.map((v) => [v.name, v]))
    const afterVars = new Map(a.variables.map((v) => [v.name, v]))
    for (const [name, v] of beforeVars) {
      const next = afterVars.get(name)
      const cssVar = cssVarName(name)
      if (!next) { add({ kind: 'variable-removed', key: `${b.key}/${name}`, before: v.values, vars: [cssVar], read: used.has(cssVar) }); continue }
      for (const mode of a.modes) {
        if (same(v.values[mode], next.values[mode])) continue
        add({ kind: 'variable-changed', key: `${b.key}/${name}/${mode}`, before: v.values[mode], after: next.values[mode], vars: [cssVar], read: used.has(cssVar) })
      }
    }
    for (const [name, v] of afterVars) {
      if (beforeVars.has(name)) continue
      const cssVar = cssVarName(name)
      add({ kind: 'variable-added', key: `${b.key}/${name}`, after: v.values, vars: [cssVar], read: used.has(cssVar) })
    }
  }
  return out
}

function diffProps(set: ComponentSetSnapshot, next: ComponentSetSnapshot, files: string[]): DriftFinding[] {
  const out: DriftFinding[] = []
  const add = (f: Omit<DriftFinding, 'id' | 'scope' | 'component' | 'files'>) => out.push({ ...f, scope: 'component', component: set.code, files, id: `${f.kind}:${set.code}:${f.key}` })
  const removed = Object.keys(set.props).filter((k) => !(k in next.props))
  const added = Object.keys(next.props).filter((k) => !(k in set.props))
  const pairedOld = new Set<string>()
  const pairedNew = new Set<string>()
  // Figma property renames are frequent (WCAG Card "Requried" / "How ti fix" became "Required" / "How to fix" on 2026-10-11).
  for (const oldKey of removed) {
    const hit = added.find((k) => !pairedNew.has(k) && same(set.props[oldKey], next.props[k]))
    if (!hit) continue
    pairedOld.add(oldKey); pairedNew.add(hit)
    add({ kind: 'prop-renamed', key: oldKey, before: oldKey, after: hit })
  }
  for (const k of removed) if (!pairedOld.has(k)) add({ kind: 'prop-removed', key: k, before: set.props[k] })
  for (const k of added) if (!pairedNew.has(k)) add({ kind: 'prop-added', key: k, after: next.props[k] })
  for (const [k, def] of Object.entries(set.props)) {
    const nd = next.props[k]
    if (!nd) continue
    if (def.type !== nd.type || !same(def.options, nd.options)) add({ kind: 'prop-type-changed', key: k, before: { type: def.type, options: def.options }, after: { type: nd.type, options: nd.options } })
    else if (!same(def.default, nd.default)) add({ kind: 'prop-default-changed', key: k, before: def.default, after: nd.default })
  }
  return out
}

function diffVariant(set: ComponentSetSnapshot, variant: ComponentVariant, next: ComponentVariant, files: string[], used: Set<string>): DriftFinding[] {
  const out: DriftFinding[] = []
  const name = variantKey(next)
  const add = (f: Omit<DriftFinding, 'id' | 'scope' | 'component' | 'variant' | 'files'>) =>
    out.push({ ...f, scope: 'component', component: set.code, variant: name, files, id: `${f.kind}:${set.code}:${name}:${f.path ?? ''}:${f.key}` })

  const { pairs, renames, added, removed } = matchNodes(variant.nodes, next.nodes)
  for (const n of added) add({ kind: 'node-added', key: n.t, path: n.p, after: { t: n.t, b: n.b } })
  for (const n of removed) add({ kind: 'node-removed', key: n.t, path: n.p, before: { t: n.t, b: n.b } })
  for (const r of renames) add({ kind: 'node-renamed', key: r.after.t, path: r.after.p, before: r.before.p, after: r.after.p, confidence: r.confidence })

  for (const { before: b, after: a } of [...pairs, ...renames]) {
    for (const [slot, name0] of Object.entries(b.b)) {
      const name1 = a.b[slot]
      if (name1 === undefined) { add({ kind: 'binding-removed', key: slot, path: a.p, before: name0, vars: [cssVarName(name0)] }); continue }
      if (name1 === name0) continue
      add({ kind: 'binding-rebound', key: slot, path: a.p, before: name0, after: name1, vars: [cssVarName(name1)], read: used.has(cssVarName(name1)) })
    }
    for (const [slot, name1] of Object.entries(a.b)) {
      if (slot in b.b) continue
      add({ kind: 'binding-added', key: slot, path: a.p, after: name1, vars: [cssVarName(name1)], read: used.has(cssVarName(name1)) })
    }
    const keys = new Set([...Object.keys(b.r ?? {}), ...Object.keys(a.r ?? {})])
    for (const k of keys) {
      const bv = b.r?.[k]
      const av = a.r?.[k]
      if (same(bv, av)) continue
      add({ kind: 'raw-changed', key: k, path: a.p, before: bv, after: av })
    }
  }
  return out
}

/** The only honest answer to "what does paddingLeft 12 → 16 actually produce": ask the generator. */
function diffDerived(before: ComponentsSnapshot, after: ComponentsSnapshot, codes: Set<string>, used: Set<string>, filesFor: (code: string) => string[]): DriftFinding[] {
  const map = (c: ComponentsSnapshot) => new Map(derivedDeclarations(c).map((d) => [d.name, d.value]))
  const b = map(before)
  const a = map(after)
  const owner = (name: string) => [...codes].find((code) => name.startsWith(derivedPrefix(code)))
  const out: DriftFinding[] = []
  const add = (kind: DriftKind, name: string, beforeV?: string, afterV?: string) => {
    const component = owner(name)
    out.push({ kind, id: `${kind}:${component ?? '-'}:${name}`, scope: 'component', component, key: name, before: beforeV, after: afterV, vars: [name], read: used.has(name), files: component ? filesFor(component) : [] })
  }
  for (const [name, value] of b) {
    const next = a.get(name)
    if (next === undefined) add('derived-removed', name, value)
    else if (next !== value) add('derived-changed', name, value, next)
  }
  for (const [name, value] of a) if (!b.has(name)) add('derived-added', name, undefined, value)
  return out
}

function diffIcons(before: Snapshot, after: Snapshot): DriftFinding[] {
  const hash = (svg: string) => createHash('sha256').update(normalizeSvg(svg).body).digest('hex').slice(0, 12)
  const out: DriftFinding[] = []
  const add = (kind: DriftKind, key: string) => out.push({ kind, id: `${kind}:icons:${key}`, scope: 'icons', key, files: ['src/shared/ui/Icon/generated.ts'] })
  const b = before.icons.icons
  const a = after.icons.icons
  for (const [key, entry] of Object.entries(b)) {
    const next = a[key]
    if (!next) add('icon-removed', key)
    else if (hash(entry.svg) !== hash(next.svg)) add('icon-changed', key)
  }
  for (const key of Object.keys(a)) if (!b[key]) add('icon-added', key)
  return out
}

/** Why a layer-level comparison would be nonsense, or '' when it is sound.
 *
 *  Two ways it goes wrong, both seen in practice:
 *  - Different extractors. extract.ts (relay) walks into instances and records their overridden
 *    layers; the REST describe() stops at the instance. Diffing one against the other reports
 *    hundreds of phantom node-removed.
 *  - No variable index. Without Enterprise access to /variables/local the REST pull cannot resolve
 *    a bound property to a variable name, so every binding reads `lib:VariableID:…` and every layer
 *    looks rebound — and values that were bound leak into the raw bag as if they had been unbound.
 *
 *  In both cases sets, variants and component properties are still accurate, so those are reported. */
export function layerDiffBlocker(before: Snapshot, after: Snapshot, allowCrossExtractor = false): string {
  if (after.bindingsUnnamed) return 'the Figma plan denied /variables/local, so bound properties came back as `lib:` ids rather than variable names — every layer would look rebound. Pull through the relay for a layer-level diff.'
  const baseline = before.source ?? (before.tokens.source === 'figma-rest' ? 'figma-rest' : 'figma-plugin')
  const live = after.source ?? 'figma-plugin'
  if (baseline !== live && !allowCrossExtractor) return `the committed snapshot came from the ${baseline} extractor and this pull from ${live}; the two describe a file differently unless parity has been measured, so layer findings would be extractor noise. Run \`npm run figma:parity\`; if it reads zero, re-run with --allow-cross-extractor.`
  return ''
}

export function diffSnapshots(before: Snapshot, after: Snapshot, root = ROOT, allowCrossExtractor = false): DriftFinding[] {
  const used = readVars(root)
  const findings: DriftFinding[] = []
  const blocker = layerDiffBlocker(before, after, allowCrossExtractor)
  if (!after.tokensStale) findings.push(...diffTokens(before.tokens, after.tokens, used))

  const manifest = readManifest(root)
  const manifestById = new Map(manifest.componentSets.map((s) => [s.code, s.id]))
  const beforeSets = new Map(before.components.sets.map((s) => [s.code, s]))
  const afterSets = new Map(after.components.sets.map((s) => [s.code, s]))
  const filesFor = (code: string) => {
    const set = afterSets.get(code) ?? beforeSets.get(code)
    return set ? [relative(root, cssFileFor(set, root)), relative(root, set.dir ? resolve(root, set.dir, `${code}.figma.ts`) : resolve(root, 'src/shared/ui', code, 'figma.ts'))] : []
  }

  for (const [code, set] of beforeSets) {
    const next = afterSets.get(code)
    if (!next) { findings.push({ kind: 'set-removed', id: `set-removed:${code}`, scope: 'component', component: code, key: set.name, before: set.name, files: filesFor(code) }); continue }
    const files = filesFor(code)
    if (set.name !== next.name) findings.push({ kind: 'set-renamed', id: `set-renamed:${code}`, scope: 'component', component: code, key: code, before: set.name, after: next.name, files })
    if (set.id !== next.id || manifestById.get(code) !== next.id) {
      findings.push({ kind: 'set-id-changed', id: `set-id-changed:${code}`, scope: 'component', component: code, key: code, before: set.id, after: next.id, files: [...files, 'figma/manifest.json'] })
    }
    findings.push(...diffProps(set, next, files))

    const beforeVariants = new Map(set.variants.map((v) => [variantKey(v), v]))
    const afterVariants = new Map(next.variants.map((v) => [variantKey(v), v]))
    // Single-COMPONENT sets have no variant props; pair them by index.
    if (beforeVariants.size === 1 && afterVariants.size === 1) {
      if (!blocker) findings.push(...diffVariant(set, set.variants[0]!, next.variants[0]!, files, used))
    } else {
      for (const [key, v] of beforeVariants) {
        const nv = afterVariants.get(key)
        if (!nv) { findings.push({ kind: 'variant-removed', id: `variant-removed:${code}:${key}`, scope: 'component', component: code, variant: key, key, before: v.name, files }); continue }
        if (!blocker) findings.push(...diffVariant(set, v, nv, files, used))
      }
      for (const [key, v] of afterVariants) {
        if (beforeVariants.has(key)) continue
        findings.push({ kind: 'variant-added', id: `variant-added:${code}:${key}`, scope: 'component', component: code, variant: key, key, after: v.name, files })
      }
    }
  }
  for (const [code, set] of afterSets) {
    if (beforeSets.has(code)) continue
    findings.push({ kind: 'set-added', id: `set-added:${code}`, scope: 'component', component: code, key: set.name, after: set.name, files: filesFor(code) })
  }

  // Derived tokens are computed from the same layer data, and icons from the same extractor.
  if (!blocker) {
    const built = new Set([...afterSets.values()].filter((s) => s.status !== 'planned' && s.status !== 'alias').map((s) => s.code))
    findings.push(...diffDerived(before.components, after.components, built, used, filesFor))
    findings.push(...diffIcons(before, after))
  }
  return findings
}

// ------------------------------------------------------------------- report

const MARK: Partial<Record<DriftKind, string>> = { 'variable-changed': '~', 'variable-added': '+', 'variable-removed': '-', 'prop-added': '+', 'prop-removed': '-', 'prop-renamed': '>', 'node-added': '+', 'node-removed': '-', 'node-renamed': '>', 'binding-added': '+', 'binding-removed': '-', 'variant-added': '+', 'variant-removed': '-', 'derived-added': '+', 'derived-removed': '-', 'icon-added': '+', 'icon-removed': '-' }
const fmt = (v: unknown) => (v === undefined ? '' : typeof v === 'string' ? v : JSON.stringify(v))

function line(f: DriftFinding): string {
  const mark = MARK[f.kind] ?? '~'
  const label = f.kind.replace(/-(added|removed|changed|renamed|rebound|type-changed|default-changed|id-changed)$/, '')
  const where = f.path ? `${f.path} · ` : ''
  const delta = f.before !== undefined && f.after !== undefined ? `${fmt(f.before)} → ${fmt(f.after)}` : fmt(f.after ?? f.before)
  const vars = f.vars?.length ? `  ${f.vars.join(' ')}${f.read === undefined ? '' : f.read ? ' ✓' : ' ✗ not read by code'}` : ''
  const conf = f.confidence === 'heuristic' ? '  (heuristic)' : ''
  return `  ${mark} ${label.padEnd(9)} ${where}${f.key}  ${delta}${vars}${conf}`
}

function printReport(report: DriftReport) {
  const stale = report.tokensStale ? ' · variables NOT checked (no REST access, no relay)' : ''
  console.log(`[figma:diff] ${report.backend} backend · baseline ${report.baseline.pulledAt} · live ${report.live.pulledAt}${stale}`)
  if (report.layerDiffSkipped) console.log(`[figma:diff] LAYERS NOT COMPARED — ${report.layerDiffSkipped}\n[figma:diff] Reporting sets, variants and component properties only.`)
  console.log('')
  const tokens = report.findings.filter((f) => f.scope === 'tokens')
  if (tokens.length) { console.log('tokens'); for (const f of tokens) console.log(line(f)); console.log('') }
  const byComponent = new Map<string, DriftFinding[]>()
  for (const f of report.findings.filter((f) => f.scope === 'component')) byComponent.set(f.component ?? '?', [...(byComponent.get(f.component ?? '?') ?? []), f])
  for (const [code, list] of [...byComponent].sort(([a], [b]) => a.localeCompare(b))) {
    console.log(`${code}  (${list[0]?.files?.[0] ?? ''})  ${list.length} change${list.length === 1 ? '' : 's'}`)
    for (const f of list) console.log(line(f))
    console.log('')
  }
  const icons = report.findings.filter((f) => f.scope === 'icons')
  if (icons.length) console.log(`icons  ${icons.length} changed (${icons.slice(0, 6).map((f) => f.key).join(', ')}${icons.length > 6 ? '…' : ''})\n`)
}

// --------------------------------------------------------------------- main

const USAGE = `npm run figma:diff -- [options]

  --rest                 pull over the Figma REST API (needs FIGMA_TOKEN) instead of the relay
  --token <t>            relay auth token
  --component <Name>     restrict the report to one component (repeatable)
  --json                 print the DriftReport instead of the human report
  --fail-on-drift        exit 1 when anything drifted (CI)
  --no-write             do not write figma/drift.json
  --allow-cross-extractor  compare layers even though the snapshots came from different
                         backends — only after 'npm run figma:parity' reads zero
  --timeout <seconds>    give up on the relay after this long (default 120)
  --help
`

async function main() {
  const argv = process.argv.slice(2)
  if (argv.includes('--help') || argv.includes('-h')) { console.log(USAGE); process.exit(0) }
  const only = new Set(argv.flatMap((a, i) => (a === '--component' ? [argv[i + 1]!] : [])))
  const asJson = argv.includes('--json')
  const backend: Backend = argv.includes('--rest') ? 'rest' : 'plugin'
  const tokenIdx = argv.indexOf('--token')
  const timeoutIdx = argv.indexOf('--timeout')
  // A diff is a quick "did anything move?", not the deliberate long pull — do not sit for ten minutes.
  const timeoutMs = (timeoutIdx >= 0 ? Number(argv[timeoutIdx + 1]) : 120) * 1000

  const before = readCommitted()
  let after: Snapshot
  try {
    after = mergeCommitted(await pullSnapshot({ backend, timeoutMs, ...(tokenIdx >= 0 ? { token: argv[tokenIdx + 1] } : {}) }))
  } catch (error) {
    console.error(`[figma:diff] pull failed: ${error instanceof Error ? error.message : String(error)}`)
    console.error(backend === 'plugin' ? '[figma:diff] or re-run with --rest and FIGMA_TOKEN set' : '[figma:diff] or re-run without --rest to pull through the relay')
    process.exit(2)
  }

  const allowCrossExtractor = argv.includes('--allow-cross-extractor')
  let findings = diffSnapshots(before, after, ROOT, allowCrossExtractor)
  if (only.size) {
    const varsOfInterest = new Set(findings.filter((f) => f.component && only.has(f.component)).flatMap((f) => f.vars ?? []))
    findings = findings.filter((f) => (f.component ? only.has(f.component) : (f.vars ?? []).some((v) => varsOfInterest.has(v))))
  }

  const counts: Partial<Record<DriftKind, number>> = {}
  for (const f of findings) counts[f.kind] = (counts[f.kind] ?? 0) + 1
  const blocker = layerDiffBlocker(before, after, allowCrossExtractor)
  const report: DriftReport = {
    generatedAt: new Date().toISOString(),
    backend,
    ...(after.tokensStale ? { tokensStale: true } : {}),
    ...(blocker ? { layerDiffSkipped: blocker } : {}),
    baseline: { pulledAt: before.components.pulledAt, fileKey: before.components.fileKey },
    live: { pulledAt: after.components.pulledAt },
    counts,
    findings,
  }

  if (asJson) { console.log(JSON.stringify(report, null, 2)) } else { printReport(report) }
  if (!argv.includes('--no-write')) writeFileSync(resolve(ROOT, 'figma/drift.json'), `${JSON.stringify(report, null, 2)}\n`)

  if (!asJson) {
    const components = new Set(findings.filter((f) => f.component).map((f) => f.component)).size
    console.log(findings.length ? `[figma:diff] ${findings.length} finding(s) across ${components} component(s) · wrote figma/drift.json` : '[figma:diff] no drift — figma/*.json matches the live file')
    if (findings.length) console.log('[figma:diff] nothing was changed. Update the code first, then `npm run figma:pull` to accept.')
  }
  process.exit(findings.length && argv.includes('--fail-on-drift') ? 1 : 0)
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  await main()
}
