// Variable-mapping report: for every component set in figma/components.json,
// list what is bound and, for every raw value, the existing variable that
// carries the same value (or say that none exists). Output:
//   figma/mapping.json           machine-readable, consumed later by figma:bind
//   docs/figma-token-mapping.md  the review document
//
//   npm run tokens:map
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { ComponentsSnapshot, ComponentSetSnapshot, TokenSnapshot, SnapshotVariable } from '../src/shared/brand/snapshot'

const root = resolve(import.meta.dirname, '..')
const tokens = JSON.parse(readFileSync(resolve(root, 'figma/tokens.json'), 'utf8')) as TokenSnapshot
const components = JSON.parse(readFileSync(resolve(root, 'figma/components.json'), 'utf8')) as ComponentsSnapshot & { tiers?: Record<string, string> }

// ------------------------------------------------------------------ indices
interface Candidate { name: string; collection: string }
const byValue = new Map<string, Candidate[]>()
const brand = tokens.collections.find((c) => c.key === 'brand')!
const defaultMode = brand.defaultMode
function indexVar(collection: string, v: SnapshotVariable, mode: string) {
  const value = v.values[mode]
  if (value === null || value === undefined) return
  const key = `${v.type}:${typeof value === 'number' ? Math.round(value * 100) / 100 : String(value).toLowerCase()}`
  byValue.set(key, [...(byValue.get(key) ?? []), { name: v.name, collection }])
}
for (const c of tokens.collections) for (const v of c.variables) indexVar(c.key, v, c.key === 'brand' ? defaultMode : c.modes[0]!)

const RANK: Record<string, number> = { brand: 0, semantics: 1, primitives: 2 }
function lookup(type: 'COLOR' | 'FLOAT' | 'STRING', value: string | number, family: string | null, roles: RegExp[]): { suggestion: string | null; alternatives: string[]; confidence: 'exact' | 'family' | 'none' } {
  const key = `${type}:${typeof value === 'number' ? Math.round(value * 100) / 100 : String(value).toLowerCase()}`
  // Numbers and strings must match a variable of the same role (a 6px padding is never a radius token). Colours may match anything.
  const hits = (byValue.get(key) ?? []).filter((h) => type === 'COLOR' || roles.some((r) => r.test(h.name)))
  if (!hits.length) return { suggestion: null, alternatives: [], confidence: 'none' }
  const score = (h: Candidate) => {
    let s = RANK[h.collection] ?? 3
    if (family && h.name.startsWith(`${family}/`)) s -= 10
    if (roles.some((r) => r.test(h.name))) s -= 3
    if (/^brand\//.test(h.name)) s += 5 // brand primitives (ikea/…) are never the right semantic target
    if (h.collection === 'semantics') s -= 0.5
    return s
  }
  const sorted = [...hits].sort((a, b) => score(a) - score(b))
  const best = sorted[0]!
  const confidence = family && best.name.startsWith(`${family}/`) ? 'family' : 'exact'
  return { suggestion: best.name, alternatives: sorted.slice(1, 4).map((h) => h.name), confidence }
}

const WEIGHTS: Record<string, number> = { thin: 100, extralight: 200, light: 300, regular: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800, black: 900 }
const ROLE: Record<string, RegExp[]> = {
  fill: [/\/bg\//, /^surface\//, /bg$/, /\/fg/, /^text\//],
  textFill: [/^text\//, /\/fg/],
  stroke: [/^border\//, /\/border/, /divider/],
  radius: [/^radius\//, /\/radius$/, /^dimension\/radius\//],
  gap: [/^space\/(inline|stack)/, /\/gap$/, /\/gap\//, /^dimension\/space\//],
  padding: [/^space\/inset/, /padding/, /^dimension\/space\//],
  fontSize: [/^font\/size-/, /font\/size/, /font-size/, /^type\/size\//],
  lineHeight: [/^font\/line-/, /line-height/, /^type\/line\//],
  strokeWeight: [/^border-width\//, /^dimension\/stroke\//, /stroke-width/],
  width: [/^size\//, /\/size$/, /^dimension\/size\//],
  height: [/^size\//, /height$/, /^dimension\/size\//],
  fontFamily: [/^font\/family-/, /^type\/family\//, /font\/family/, /font-family/],
  fontWeight: [/^font\/weight-/, /^type\/weight\//, /font\/weight/, /font-weight/],
}

// ------------------------------------------------------------------ per set
export interface RawFinding {
  variant: string
  layer: string
  property: string
  value: string | number
  suggestion: string | null
  confidence: 'exact' | 'family' | 'none'
  alternatives: string[]
  note?: string
}
export interface SetMapping {
  code: string
  id: string
  name: string
  tier: string
  variants: number
  coverage: number | null
  bound: string[]
  family: string | null
  raw: RawFinding[]
  instances: string[]
  notes: string[]
}

function familyOf(set: ComponentSetSnapshot): string | null {
  const counts = new Map<string, number>()
  for (const v of set.variants) for (const n of v.nodes) for (const name of Object.values(n.b)) {
    const head = name.split('/')[0]!
    if (head === 'icon') continue
    counts.set(head, (counts.get(head) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}

function mapSet(set: ComponentSetSnapshot, tier: string): SetMapping {
  const family = familyOf(set)
  const bound = new Set<string>()
  const instances = new Set<string>()
  const raw: RawFinding[] = []
  let boundCount = 0
  let rawCount = 0
  const seen = new Set<string>()
  const push = (f: RawFinding) => {
    const k = `${f.layer}|${f.property}|${f.value}`
    if (seen.has(k)) return
    seen.add(k)
    raw.push(f)
  }
  for (const variant of set.variants) {
    const instancePaths = variant.nodes.filter((n) => n.t === 'INSTANCE').map((n) => n.p)
    for (const node of variant.nodes) {
      if (instancePaths.some((ip) => node.p.startsWith(`${ip}/`))) continue
      if (node.t === 'INSTANCE') instances.add(node.i ?? '?')
      for (const name of Object.values(node.b)) { bound.add(name); boundCount++ }
      const r = (node.r ?? {}) as Record<string, unknown>
      const layer = node.p.split('/').slice(1).join('/') || '(root)'
      const isText = node.t === 'TEXT'
      // Instances: only their own overrides count; bindings inside belong to the child set.
      if (node.t === 'INSTANCE') continue
      const add = (property: string, value: string | number, type: 'COLOR' | 'FLOAT' | 'STRING', roles: RegExp[], note?: string) => {
        rawCount++
        const hit = lookup(type, value, family, roles)
        push({ variant: variant.name, layer, property, value, ...hit, ...(note ? { note } : {}) })
      }
      if (typeof r.fill === 'string' && r.fill.startsWith('#')) add('fill', r.fill, 'COLOR', isText ? ROLE.textFill! : ROLE.fill!)
      if (typeof r.stroke === 'string' && r.stroke.startsWith('#')) add('stroke', r.stroke, 'COLOR', ROLE.stroke!)
      if (typeof r.radius === 'number' && r.radius > 0) add('radius', r.radius, 'FLOAT', ROLE.radius!)
      if (Array.isArray(r.radius)) add('radius', (r.radius as number[]).join('/'), 'FLOAT', ROLE.radius!, 'per-corner radius; Figma variables can only bind a uniform radius per corner property')
      if (typeof r.strokeWeight === 'number' && (r.stroke || node.b.stroke)) add('strokeWeight', r.strokeWeight, 'FLOAT', ROLE.strokeWeight!)
      if (typeof r.itemSpacing === 'number') add('gap', r.itemSpacing, 'FLOAT', ROLE.gap!)
      for (const k of ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom'] as const) if (typeof r[k] === 'number') add(k, r[k] as number, 'FLOAT', ROLE.padding!)
      if (isText) {
        if (typeof r.fontSize === 'number') add('fontSize', r.fontSize, 'FLOAT', ROLE.fontSize!)
        if (typeof r.lineHeightPx === 'number') add('lineHeight', r.lineHeightPx, 'FLOAT', ROLE.lineHeight!)
        if (typeof r.font === 'string') add('fontFamily', r.font, 'STRING', ROLE.fontFamily!, r.font === 'Noto Sans' ? undefined : `every font/family-* semantic resolves to Noto Sans; binding to a primitive type/family/* keeps "${r.font}"`)
        if (typeof r.style === 'string') { const w = WEIGHTS[r.style.toLowerCase().replace(/[\s-]/g, '').replace(/italic$/, '')]; if (w) add('fontWeight', w, 'FLOAT', ROLE.fontWeight!) }
      }
      if (typeof r.opacity === 'number') push({ variant: variant.name, layer, property: 'opacity', value: r.opacity, suggestion: null, confidence: 'none', alternatives: [], note: 'no opacity variables exist yet' })
      if (Array.isArray(r.effects)) for (const e of r.effects as string[]) if (e.includes(':#')) push({ variant: variant.name, layer, property: 'effect', value: e, suggestion: null, confidence: 'none', alternatives: [], note: 'shadow colour is raw; no effect tokens exist' })
    }
  }
  const notes: string[] = []
  if (!family) notes.push('No token family of its own: nothing but shared icon/glyph tokens is bound.')
  if (/^Frame \d+/.test(set.name)) notes.push('Unnamed in Figma; rename the component before binding.')
  return { code: (set as { code?: string }).code ?? set.name, id: set.id, name: set.name, tier, variants: set.variants.length, coverage: boundCount + rawCount ? Math.round((100 * boundCount) / (boundCount + rawCount)) : null, bound: [...bound].sort(), family, raw, instances: [...instances].sort(), notes }
}

const tiers = components.tiers ?? {}
const mappings = components.sets.map((s) => mapSet(s, tiers[s.id] ?? 'unassigned'))
writeFileSync(resolve(root, 'figma/mapping.json'), `${JSON.stringify({ generatedFrom: 'figma/components.json + figma/tokens.json', sets: mappings }, null, 2)}\n`)

// ------------------------------------------------------------------ report
const statusOf = (s: { status?: string; aliasOf?: string }) => s.status === 'alias' ? `alias of \`${s.aliasOf}\`` : s.status === 'built' ? 'built' : 'to build'
// Alias sets are covered by another component's glyph table / props; their raw values are not tracked separately.
const aliased = new Set(components.sets.filter((s) => (s as { status?: string }).status === 'alias').map((s) => s.code))
const order = ['Atoms', 'Molecules', 'Organisms', 'Other']
const md: string[] = []
md.push('# Figma → variable mapping (design-side gaps per component)', '', `Generated by \`npm run tokens:map\` from \`figma/components.json\` (${components.pulledAt}) and \`figma/tokens.json\`. Every raw (unbound) value a component still carries in Figma is listed with the existing variable that has the same value; in code these values are read as \`--bb-derived-*\` tokens until they are bound in Figma. Suggestions are existing variables whose **${defaultMode}** value equals the raw value; "family" means the variable already belongs to this component's own token group, "exact" means the value matches elsewhere, "none" means a new variable is needed.`, '', '| Component | Figma id | Tier | Variants | Bound | Raw values | Code name | Status |', '|---|---|---|---|---|---|---|---|')
for (const m of [...mappings].sort((a, b) => order.indexOf(a.tier) - order.indexOf(b.tier) || (b.coverage ?? 0) - (a.coverage ?? 0))) {
  md.push(`| ${m.name} | \`${m.id}\` | ${m.tier} | ${m.variants} | ${m.coverage ?? '–'} % | ${m.raw.length} | \`${m.code}\` | ${statusOf(components.sets.find((s) => s.code === m.code) as { status?: string; aliasOf?: string })} |`)
}
md.push('', '## Per component', '')
for (const m of [...mappings].sort((a, b) => order.indexOf(a.tier) - order.indexOf(b.tier) || (b.coverage ?? 0) - (a.coverage ?? 0))) {
  if (aliased.has(m.code)) continue
  md.push(`### ${m.name} → \`${m.code}\``, '', `Figma \`${m.id}\` · ${m.tier} · ${m.variants} variant(s) · ${m.coverage ?? '–'} % bound · token family: ${m.family ? `\`${m.family}/*\`` : 'none'}`, '')
  for (const n of m.notes) md.push(`> ${n}`, '')
  if (m.instances.length) md.push(`Uses instances of: ${m.instances.map((i) => `\`${i}\``).join(', ')}`, '')
  md.push(`**Bound (${m.bound.length}):** ${m.bound.length ? m.bound.map((b) => `\`${b}\``).join(', ') : 'nothing'}`, '')
  if (m.raw.length) {
    md.push(`**Raw values (${m.raw.length}) and the variable to bind:**`, '', '| Layer | Property | Value | Bind to | Match | Note |', '|---|---|---|---|---|---|')
    for (const f of m.raw) md.push(`| ${f.layer} | ${f.property} | \`${f.value}\` | ${f.suggestion ? `\`${f.suggestion}\`` : '**new variable**'} | ${f.confidence}${f.alternatives.length ? ` (alt: ${f.alternatives.map((a) => `\`${a}\``).join(', ')})` : ''} | ${f.note ?? ''} |`)
    md.push('')
  } else md.push('No raw values.', '')
}
// New variables needed, deduplicated
const needed = new Map<string, Set<string>>()
for (const m of mappings) if (!aliased.has(m.code)) for (const f of m.raw) if (!f.suggestion) { const k = `${f.property} = ${f.value}`; needed.set(k, (needed.get(k) ?? new Set()).add(m.code)) }
md.push('## Values with no existing variable (need new tokens in Figma)', '', '| Property = value | Used by |', '|---|---|')
for (const [k, users] of [...needed.entries()].sort()) md.push(`| ${k} | ${[...users].join(', ')} |`)
md.push('')
writeFileSync(resolve(root, 'docs/figma-token-mapping.md'), md.join('\n'))
const totals = mappings.filter((m) => !aliased.has(m.code))
console.log(`[tokens:map] ${totals.length} sets, ${totals.reduce((n, m) => n + m.raw.length, 0)} raw values, ${[...needed.keys()].length} distinct values need new variables → docs/figma-token-mapping.md`)
