// Drift gate between Figma and code. Exit 1 on any finding.
//
//  1. Generated files are up to date with figma/*.json.
//  2. Every `var(--bb-…)` used under src/shared/ui, src/shell and src/features exists.
//  3. No hardcoded visual values (hex, rgb(), px, named colours) in component CSS.
//  4. Each code component consumes every token its Figma set binds, unless the
//     component's figma.ts lists the token under `figmaGaps` with a reason.
//  5. Each code component reads every `--bb-derived-*` its Figma set generates —
//     the raw widths, heights, paddings and gaps Figma has not turned into variables
//     yet. Unread ones are debt, recorded with their VALUE in
//     figma/derived-baseline.json: a baselined token whose value later moves in Figma
//     re-surfaces as `derived-token-drifted`, because that is a design change reaching
//     no code. Permanent exceptions go in the component's figma.ts `derivedGaps`.
//  6. Figma component properties, setIds and the manifest agree with the code
//     (scripts/check-props.ts).
//  7. Variable layering: Semantics is single-mode and aliases Foundations only; the brand
//     switch lives in Brand UI (checkLayering).
//  8. Every brand in plugin.config.json names a collection and mode the pulled Figma
//     snapshot has, so the plugin never silently falls back to config tokens
//     (checkBrandSources).
//
// Warnings (printed, never fail the gate): same-named Figma layers in one variant that the
// generator told apart by position (`vector--1`) — see layerCollisionWarnings.
//
// `npm run tokens:check -- --write-baseline` rewrites the baseline. It is a last
// resort: it accepts the current values as debt, so say why in the commit message.
import { readFileSync, existsSync, writeFileSync } from 'node:fs'
import { resolve, relative } from 'node:path'
import { derivedDeclarations, derivedLayerCollisions, generate, readInputs, ROOT } from './gen-tokens'
import { checkProps, type Finding } from './check-props'
import { COMPONENT_DIRS, walkFiles } from './component-sources'
import { cssVarName, type ComponentsSnapshot, type TokenSnapshot } from '../src/shared/brand/snapshot'

export type { Finding }

const RAW_PATTERNS: { name: string; re: RegExp }[] = [
  { name: 'hex colour', re: /#[0-9a-fA-F]{3,8}\b/ },
  { name: 'rgb/hsl colour', re: /\b(?:rgb|hsl)a?\(/ },
  { name: 'px length', re: /(?<![\w-])(?!0px)\d*\.?\d+px\b/ },
  { name: 'named colour', re: /:\s*(?:white|black|red|blue|green|gray|grey|transparent)\s*[;!]/ },
]

export function findRawValues(css: string, file: string): Finding[] {
  const findings: Finding[] = []
  css.split('\n').forEach((line, i) => {
    if (/^\s*\/\*|\/\*.*allow-raw.*\*\//.test(line)) return
    for (const { name, re } of RAW_PATTERNS) {
      if (re.test(line)) findings.push({ rule: 'no-raw-values', file, line: i + 1, message: `${name} in "${line.trim()}"` })
    }
  })
  return findings
}

export function findUnknownVars(source: string, file: string, known: Set<string>): Finding[] {
  const findings: Finding[] = []
  for (const m of source.matchAll(/var\((--bb-[a-z0-9-]+)/g)) {
    if (!known.has(m[1]!)) findings.push({ rule: 'unknown-token', file, message: `${m[1]} is not a generated token` })
  }
  return findings
}

interface FigmaMeta {
  figmaGaps?: Record<string, string>
  /** Generated `--bb-derived-*` names the component deliberately does not read, with the reason.
   *  Separate from figmaGaps on purpose: that one is keyed by Figma variable name, this one by
   *  CSS var name, and merging them would let a typo in either silently satisfy the other rule. */
  derivedGaps?: Record<string, string>
}

const BASELINE_FILE = 'figma/derived-baseline.json'
interface DerivedBaseline { $comment?: string; tokens: Record<string, string> }

function readBaseline(root: string): DerivedBaseline {
  const file = resolve(root, BASELINE_FILE)
  if (!existsSync(file)) return { tokens: {} }
  return JSON.parse(readFileSync(file, 'utf8')) as DerivedBaseline
}

async function loadFigmaMeta(file: string): Promise<FigmaMeta> {
  if (!existsSync(file)) return {}
  const mod = (await import(file)) as { figma?: FigmaMeta }
  return mod.figma ?? {}
}

export async function checkComponentCoverage(root = ROOT, options: { writeBaseline?: boolean } = {}): Promise<Finding[]> {
  const { components } = readInputs(root)
  const baseline = readBaseline(root)
  const nextBaseline: Record<string, string> = {}
  const generated = new Set<string>()
  const findings: Finding[] = []
  for (const set of components.sets) {
    if (set.status === 'planned' || set.status === 'alias') continue
    const dir = set.dir ? resolve(root, set.dir) : resolve(root, 'src/shared/ui', set.code)
    const cssFile = resolve(dir, `${set.code}.css`)
    if (!existsSync(cssFile)) { findings.push({ rule: 'missing-component', file: relative(root, cssFile), message: `Figma set "${set.name}" has no code component` }); continue }
    const css = readFileSync(cssFile, 'utf8')
    const file = relative(root, cssFile)
    const meta = await loadFigmaMeta(set.dir ? resolve(dir, `${set.code}.figma.ts`) : resolve(dir, 'figma.ts'))
    const bound = new Set<string>()
    for (const v of set.variants) for (const n of v.nodes) for (const name of Object.values(n.b)) bound.add(name)
    for (const name of bound) {
      if (name.startsWith('lib:')) continue // remote library variable: no local value to generate a token from; listed in docs/figma-token-mapping.md
      if (meta.figmaGaps?.[name]) continue
      if (!css.includes(`var(${cssVarName(name)})`)) {
        findings.push({ rule: 'figma-token-unused', file, message: `Figma binds "${name}" but the component never reads ${cssVarName(name)}` })
      }
    }

    // Raw Figma geometry: the generator turns it into --bb-derived-*, but nothing until now
    // checked that the component actually reads it, so a resize could land nowhere.
    for (const { name, value } of derivedDeclarations({ ...components, sets: [set] })) {
      generated.add(name)
      if (meta.derivedGaps?.[name]) continue
      if (css.includes(`var(${name})`)) {
        if (baseline.tokens[name] !== undefined) findings.push({ rule: 'derived-baseline-stale', file: BASELINE_FILE, message: `${name} is read by ${file} now — delete the baseline entry` })
        continue
      }
      nextBaseline[name] = value
      if (options.writeBaseline) continue
      const based = baseline.tokens[name]
      if (based === undefined) findings.push({ rule: 'derived-token-unused', file, message: `Figma generates ${name} (${value}) but the component never reads it` })
      else if (based !== value) findings.push({ rule: 'derived-token-drifted', file, message: `${name} moved ${based} → ${value} in Figma and ${set.code} still does not read it — wire it up, or add it to derivedGaps` })
    }
  }
  for (const name of Object.keys(baseline.tokens)) {
    if (!generated.has(name)) findings.push({ rule: 'derived-baseline-stale', file: BASELINE_FILE, message: `${name} is no longer generated — delete the baseline entry` })
  }
  if (options.writeBaseline) {
    const sorted = Object.fromEntries(Object.entries(nextBaseline).sort(([a], [b]) => a.localeCompare(b)))
    const payload: DerivedBaseline = { $comment: 'Derived tokens from raw Figma geometry that no component reads yet — debt, not design. Shrink me: wire the token up, or record a reason in the component figma.ts `derivedGaps`. Values are stored so that a later change to one in Figma re-surfaces as `derived-token-drifted` instead of staying muted. See scripts/check-tokens.ts.', tokens: sorted }
    writeFileSync(resolve(root, BASELINE_FILE), `${JSON.stringify(payload, null, 2)}\n`)
    console.log(`[tokens:check] wrote ${BASELINE_FILE} — ${Object.keys(sorted).length} unread derived token(s)`)
  }
  return findings
}

/**
 * Layering contract (2026-09-23, "brand switch lives in Brand UI"):
 *   Foundations  1 mode   raw values, one namespace per brand
 *   Semantics    1 mode   brand-neutral scales; aliases Foundations only
 *   Brand UI     N modes  tier 1 app tokens (surface/text/border/icon/feedback/font/a11y) alias
 *                         Foundations per mode; tier 2 component tokens alias tier 1 or Semantics.
 * The generator already refuses a name that exists in two collections, so the only way to put
 * brand back into Semantics is to give it a second mode or an alias into Brand UI — both caught here.
 */
export function checkLayering(tokens: TokenSnapshot, file = 'figma/tokens.json'): Finding[] {
  const findings: Finding[] = []
  const byName = new Map(tokens.collections.map((c) => [c.name, c]))
  const semantics = byName.get('Semantics')
  const brandUi = byName.get('Brand UI')
  if (!semantics || !brandUi) return findings
  if (semantics.modes.length !== 1) {
    findings.push({ rule: 'semantics-multi-mode', file, message: `Semantics has ${semantics.modes.length} modes (${semantics.modes.join(', ')}) — the brand switch belongs in Brand UI; Semantics holds shared scales only` })
  }
  for (const v of semantics.variables) {
    for (const [mode, target] of Object.entries(v.aliases ?? {})) {
      if (!target.startsWith('Foundations/')) findings.push({ rule: 'semantics-alias-layer', file, message: `Semantics/${v.name} (${mode}) aliases ${target} — Semantics may alias Foundations only` })
    }
  }
  for (const v of brandUi.variables) {
    for (const [mode, target] of Object.entries(v.aliases ?? {})) {
      const collection = target.split('/')[0]
      if (collection !== 'Foundations' && collection !== 'Semantics' && collection !== 'Brand UI') findings.push({ rule: 'brand-ui-alias-layer', file, message: `Brand UI/${v.name} (${mode}) aliases ${target} — unknown collection` })
    }
  }
  return findings
}

/**
 * Same-named layers in one variant share a derived name, so the generator keeps the historical
 * name for one of them and gives each other value its layer position (`vector--1`). Those tokens
 * are safe to read, but they renumber when a layer is added or moved: the fix is distinct layer
 * names in Figma, so this lists what to rename.
 */
interface BrandSourceRef { source: { collection: string; mode: string } }

/** The sandbox resolves a brand by collection + mode NAME (src/shared/brand/resolve.ts); a
 *  rename in Figma that misses plugin.config.json only shows up as a fallback banner at runtime. */
export function checkBrandSources(brands: Record<string, BrandSourceRef>, tokens: TokenSnapshot, file = 'plugin.config.json'): Finding[] {
  const findings: Finding[] = []
  const byName = new Map(tokens.collections.map((c) => [c.name, c]))
  for (const [id, { source }] of Object.entries(brands)) {
    const collection = byName.get(source.collection)
    if (!collection) {
      findings.push({ rule: 'brand-source-collection', file, message: `brand "${id}" uses collection "${source.collection}", which figma/tokens.json does not have (${[...byName.keys()].join(', ')})` })
    } else if (!collection.modes.includes(source.mode)) {
      findings.push({ rule: 'brand-source-mode', file, message: `brand "${id}" uses mode "${source.mode}", which "${source.collection}" does not have (${collection.modes.join(', ')})` })
    }
  }
  return findings
}

export function layerCollisionWarnings(components: ComponentsSnapshot): string[] {
  return derivedLayerCollisions(components).map((c) => {
    const parts = [...new Set(c.tokens.map((t) => t.replace(/(--\d+)-.*$/, '$1')))]
    return `${c.set} › ${c.variant}: ${c.nodes.length} layers named "${c.layer}" (${c.nodes.join(', ')}) — ${c.tokens.length} value(s) the shared name dropped are only reachable as ${parts.map((p) => `${p}-*`).join(', ')}; give the layers distinct names in Figma`
  })
}

export async function runChecks(root = ROOT, options: { writeBaseline?: boolean } = {}): Promise<Finding[]> {
  const findings: Finding[] = []
  const inputs = readInputs(root)
  findings.push(...checkLayering(inputs.tokens))
  const config = JSON.parse(readFileSync(resolve(root, 'plugin.config.json'), 'utf8')) as { brand: { brands: Record<string, BrandSourceRef> } }
  findings.push(...checkBrandSources(config.brand.brands, inputs.tokens))
  const files = generate(inputs)
  for (const [rel, content] of Object.entries(files)) {
    const abs = resolve(root, rel)
    if (!existsSync(abs) || readFileSync(abs, 'utf8') !== content) findings.push({ rule: 'stale-generated', file: rel, message: 'out of date — run `npm run gen:tokens`' })
  }
  const known = new Set<string>()
  for (const [rel, content] of Object.entries(files)) if (rel.endsWith('.css')) for (const m of content.matchAll(/(--bb-[a-z0-9-]+):/g)) known.add(m[1]!)

  for (const dir of COMPONENT_DIRS) {
    for (const file of walkFiles(resolve(root, dir))) {
      const rel = relative(root, file)
      const source = readFileSync(file, 'utf8')
      findings.push(...findUnknownVars(source, rel, known))
      if (file.endsWith('.css')) findings.push(...findRawValues(source, rel))
    }
  }
  findings.push(...(await checkComponentCoverage(root, options)))
  const { components } = readInputs(root)
  const manifest = JSON.parse(readFileSync(resolve(root, 'figma/manifest.json'), 'utf8')) as { componentSets: { code: string; id: string }[] }
  findings.push(...(await checkProps(root, components, new Map(manifest.componentSets.map((s) => [s.code, s.id])))))
  return findings
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const findings = await runChecks(ROOT, { writeBaseline: process.argv.includes('--write-baseline') })
  for (const w of layerCollisionWarnings(readInputs(ROOT).components)) console.warn(`[tokens:check] warning  derived-layer-collision  ${w}`)
  for (const f of findings) console.error(`[tokens:check] ${f.rule}  ${f.file}${f.line ? `:${f.line}` : ''}  ${f.message}`)
  console.log(findings.length ? `[tokens:check] ${findings.length} finding(s)` : '[tokens:check] OK — code matches figma/*.json')
  process.exit(findings.length ? 1 : 0)
}
