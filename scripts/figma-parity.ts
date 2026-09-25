// Do the relay and REST extractors describe the same file the same way?
//
//   npm run figma:parity            # needs the relay running AND FIGMA_TOKEN
//   npm run figma:parity -- --component WcagCard
//
// Why this exists. `figma:diff` refuses to compare layers across backends, because
// extract.ts (relay) and the REST describe() are two implementations of one contract and
// a mismatch shows up as hundreds of phantom findings — we shipped exactly that bug once.
// The refusal is right until parity is *measured*, which is what this does: pull both at
// the same moment, diff one against the other, and report what still differs. Zero layer
// findings is the licence to run `figma:diff --rest --allow-cross-extractor`; anything else
// is a divergence to fix in the REST describer first.
//
// It compares two live pulls, so any finding is an extractor difference, never a design change.
import { resolve } from 'node:path'
import { mergeCommitted, pullSnapshot } from './figma-pull'
import { diffSnapshots, type DriftFinding } from './figma-diff'

const LAYER_KINDS = new Set(['node-added', 'node-removed', 'node-renamed', 'binding-added', 'binding-removed', 'binding-rebound', 'raw-changed', 'derived-added', 'derived-removed', 'derived-changed'])

async function main() {
  const argv = process.argv.slice(2)
  const only = new Set(argv.flatMap((a, i) => (a === '--component' ? [argv[i + 1]!] : [])))

  console.log('[figma:parity] pulling through the relay…')
  const relay = mergeCommitted(await pullSnapshot({ backend: 'plugin', timeoutMs: 300_000 }))
  console.log('[figma:parity] pulling through REST…')
  const rest = mergeCommitted(await pullSnapshot({ backend: 'rest' }))
  if (rest.bindingsUnnamed) {
    console.error('[figma:parity] the REST pull could not name bindings — run `npm run figma:pull` through the relay once to record variable ids, then retry.')
    process.exit(2)
  }

  // Compare the two as if REST were "after". Same instant, same file: every finding is
  // an extractor difference. Force the layer comparison on — refusing it is the thing under test.
  let findings = diffSnapshots({ ...relay, source: 'figma-plugin' }, { ...rest, source: 'figma-plugin' })
  if (only.size) findings = findings.filter((f) => f.component && only.has(f.component))
  const layer = findings.filter((f) => LAYER_KINDS.has(f.kind))
  const other = findings.filter((f) => !LAYER_KINDS.has(f.kind))

  const byKind = new Map<string, DriftFinding[]>()
  for (const f of layer) byKind.set(f.kind, [...(byKind.get(f.kind) ?? []), f])
  for (const [kind, list] of [...byKind].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n${kind}  ${list.length}`)
    for (const f of list.slice(0, 5)) console.log(`   ${f.component} · ${f.path ?? ''} · ${f.key}  ${JSON.stringify(f.before)} → ${JSON.stringify(f.after)}`)
    if (list.length > 5) console.log(`   … ${list.length - 5} more`)
  }
  if (other.length) console.log(`\n${other.length} non-layer finding(s) — sets/props/variants should never differ between backends: ${other.slice(0, 3).map((f) => `${f.kind} ${f.component}`).join(', ')}`)

  console.log('')
  if (!layer.length && !other.length) {
    console.log('[figma:parity] the two extractors agree. `npm run figma:diff -- --rest --allow-cross-extractor` is safe for this file.')
  } else {
    console.log(`[figma:parity] ${layer.length} layer difference(s), ${other.length} other — the REST describer in scripts/figma-pull.ts still diverges from src/shared/brand/extract.ts.`)
    console.log('[figma:parity] until this reads zero, keep using the relay for layer-level diffs.')
  }
  process.exit(layer.length + other.length ? 1 : 0)
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  await main().catch((error: unknown) => { console.error(`[figma:parity] ${error instanceof Error ? error.message : String(error)}`); process.exit(2) })
}
