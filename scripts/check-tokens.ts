// Drift gate between Figma and code. Exit 1 on any finding.
//
//  1. Generated files are up to date with figma/*.json.
//  2. Every `var(--bb-…)` used under src/shared/ui and src/shell exists.
//  3. No hardcoded visual values (hex, rgb(), px, named colours) in component CSS.
//  4. Each code component consumes every token its Figma set binds, unless the
//     component's figma.ts lists the token under `figmaGaps` with a reason.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { resolve, relative, join } from 'node:path'
import { generate, readInputs, ROOT } from './gen-tokens'
import { cssVarName } from '../src/shared/brand/snapshot'

export interface Finding { rule: string; file: string; message: string; line?: number }

const COMPONENT_DIRS = ['src/shared/ui', 'src/shell']
const RAW_PATTERNS: { name: string; re: RegExp }[] = [
  { name: 'hex colour', re: /#[0-9a-fA-F]{3,8}\b/ },
  { name: 'rgb/hsl colour', re: /\b(?:rgb|hsl)a?\(/ },
  { name: 'px length', re: /(?<![\w-])(?!0px)\d*\.?\d+px\b/ },
  { name: 'named colour', re: /:\s*(?:white|black|red|blue|green|gray|grey|transparent)\s*[;!]/ },
]

function walkFiles(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    if (entry === 'legacy' || entry === 'generated') continue
    if (statSync(p).isDirectory()) walkFiles(p, out)
    else out.push(p)
  }
  return out
}

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

interface FigmaMeta { figmaGaps?: Record<string, string> }

async function loadFigmaMeta(file: string): Promise<FigmaMeta> {
  if (!existsSync(file)) return {}
  const mod = (await import(file)) as { figma?: FigmaMeta }
  return mod.figma ?? {}
}

export async function checkComponentCoverage(root = ROOT): Promise<Finding[]> {
  const { components } = readInputs(root)
  const findings: Finding[] = []
  for (const set of components.sets) {
    if (set.status === 'planned' || set.status === 'alias') continue
    const dir = set.dir ? resolve(root, set.dir) : resolve(root, 'src/shared/ui', set.code)
    const cssFile = resolve(dir, `${set.code}.css`)
    if (!existsSync(cssFile)) { findings.push({ rule: 'missing-component', file: relative(root, cssFile), message: `Figma set "${set.name}" has no code component` }); continue }
    const css = readFileSync(cssFile, 'utf8')
    const meta = await loadFigmaMeta(set.dir ? resolve(dir, `${set.code}.figma.ts`) : resolve(dir, 'figma.ts'))
    const bound = new Set<string>()
    for (const v of set.variants) for (const n of v.nodes) for (const name of Object.values(n.b)) bound.add(name)
    for (const name of bound) {
      if (name.startsWith('lib:')) continue // remote library variable: no local value to generate a token from; listed in docs/figma-token-mapping.md
      if (meta.figmaGaps?.[name]) continue
      if (!css.includes(`var(${cssVarName(name)})`)) {
        findings.push({ rule: 'figma-token-unused', file: relative(root, cssFile), message: `Figma binds "${name}" but the component never reads ${cssVarName(name)}` })
      }
    }
  }
  return findings
}

export async function runChecks(root = ROOT): Promise<Finding[]> {
  const findings: Finding[] = []
  const files = generate(readInputs(root))
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
  findings.push(...(await checkComponentCoverage(root)))
  return findings
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const findings = await runChecks()
  for (const f of findings) console.error(`[tokens:check] ${f.rule}  ${f.file}${f.line ? `:${f.line}` : ''}  ${f.message}`)
  console.log(findings.length ? `[tokens:check] ${findings.length} finding(s)` : '[tokens:check] OK — code matches figma/*.json')
  process.exit(findings.length ? 1 : 0)
}
