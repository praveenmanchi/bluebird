// Which variable should replace a hard-coded value. Pure, so the sandbox and the
// mock share it. Two separate questions:
//  - Will it keep the layer looking the same? Decided here, in the layer's own mode.
//    A value that only matches in another brand's mode is not a match.
//  - Is it the one the designer meant? Only ever likely, so rank.ts orders the
//    candidates and the gap between the first two says how sure that order is.
import type { LibraryVariable } from '@shared/libraries/types'
import { CATEGORIES, type Candidate, type Finding, type MapperGroup, type MatchContext, type MatchKind, type ValueScope } from './messages'
import { prefixOf, roleOf, scoreOf, wordsOf, type Rankable } from './rank'

/** CIE76 colour difference under which two colours read as the same one. */
const NEAR_COLOR = 10
const EXACT_ALPHA = 0.005
const NEAR_ALPHA = 0.1
const EXACT_NUMBER = 0.01
/** A number is near within a quarter of its value, at least 1 px and at most 8 px. */
const NEAR_RATIO = 0.25
const NEAR_MAX_PX = 8
/** Radii this large only mean "fully rounded", whatever the number. */
const PILL_RADIUS = 100
const MAX_NEAR = 6
const MAX_EXACT = 100
/** The first pick must beat the second by this much to skip a designer's check. */
const SURE_GAP = 4
/** And must score this much itself: a lone candidate has no gap, however poor it is. */
const SURE_SCORE = 2
/** Scores are sums of decimals: 6.85 - 2.85 is 3.9999… */
const ROUNDING = 1e-9

const KIND_RANK: Readonly<Record<MatchKind, number>> = { exact: 0, check: 1, near: 2, none: 3 }
const NO_CONTEXT: MatchContext = { modes: {}, words: [], neighbours: [] }

function inScope(scopes: readonly string[], scope: ValueScope): boolean {
  if (scopes.includes('ALL_SCOPES') || scopes.includes(scope)) return true
  return scope.endsWith('_FILL') && scopes.includes('ALL_FILLS')
}

interface Rgba { r: number; g: number; b: number; a: number }

function parseHex(hex: string): Rgba | null {
  const m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(hex)
  if (!m) return null
  const n = parseInt(m[1]!, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: m[2] ? parseInt(m[2], 16) / 255 : 1 }
}

type Lab = readonly [number, number, number]

function toLab({ r, g, b }: Rgba): Lab {
  const linear = (c: number) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
  const [lr, lg, lb] = [linear(r), linear(g), linear(b)]
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  const x = f((0.4124 * lr + 0.3576 * lg + 0.1805 * lb) / 0.95047)
  const y = f(0.2126 * lr + 0.7152 * lg + 0.0722 * lb)
  const z = f((0.0193 * lr + 0.1192 * lg + 0.9505 * lb) / 1.08883)
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)]
}

interface Compared { distance: number; kind: 'exact' | 'near' | 'far' }

function compareColor(target: Rgba, text: string): Compared | null {
  const c = parseHex(text)
  if (!c) return null
  const alpha = Math.abs(c.a - target.a)
  if (alpha > NEAR_ALPHA) return null
  if (c.r === target.r && c.g === target.g && c.b === target.b && alpha <= EXACT_ALPHA) return { distance: 0, kind: 'exact' }
  const [a, b] = [toLab(target), toLab(c)]
  const distance = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
  return { distance, kind: distance <= NEAR_COLOR ? 'near' : 'far' }
}

function compareNumber(target: number, text: string, scope: ValueScope): Compared | null {
  const n = Number(text)
  if (!Number.isFinite(n)) return null
  const distance = Math.abs(n - target)
  if (distance < EXACT_NUMBER) return { distance, kind: 'exact' }
  const limit = Math.min(NEAR_MAX_PX, Math.max(1, target * NEAR_RATIO))
  const pill = scope === 'CORNER_RADIUS' && target >= PILL_RADIUS && n >= PILL_RADIUS
  return { distance, kind: distance <= limit || pill ? 'near' : 'far' }
}

/** "#383838C4" reads as "#383838 · 77%". */
function showValue(text: string): string {
  const c = parseHex(text)
  if (!c) return text
  const hex = text.slice(0, 7).toUpperCase()
  return c.a < 1 ? `${hex} · ${Math.round(c.a * 100)}%` : hex
}

interface Entry extends Rankable { variable: LibraryVariable; primitive: boolean }

interface Hit { entry: Entry; text: string; compared: Compared }

export interface MatchInput {
  value: number | string
  opacity?: number
  scope: ValueScope
  /** Defaults to the scope. Gap and padding share one. */
  role?: string
  context?: MatchContext
}

export interface Recommendation {
  match: MatchKind
  candidates: readonly Candidate[]
  /** How many variables have this exact value. */
  matches: number
  /** The modes compared in, for labels: "Bridge". Empty when the source has no modes. */
  mode?: string
}

const toCandidate = (hit: Hit): Candidate => ({
  key: hit.entry.variable.key, name: hit.entry.variable.name, value: showValue(hit.text), collection: hit.entry.variable.collection, exact: hit.compared.kind === 'exact',
})

/**
 * The value this layer would get. The first mode is the collection's default, which is what
 * Figma renders when a layer sets none. Undefined when the layer's mode isn't one the variable
 * has: guessing could call a different value a match.
 */
function valueIn(v: LibraryVariable, modes: MatchContext['modes']): string | undefined {
  const wanted = modes[v.collection]
  if (wanted === undefined || v.values.length === 1) return v.values[0]?.value
  return v.values.find((m) => m.mode === wanted)?.value
}

/** Prepares the source once, so a selection of thousands of values only pays for ranking. */
export function createMatcher(variables: readonly LibraryVariable[]): (input: MatchInput) => Recommendation {
  const collections = new Map<string, readonly string[]>()
  for (const v of variables) if (v.values.length > 1) collections.set(v.collection, v.values.map((m) => m.mode))
  // A name that starts with a mode ("akzonobel/color/…") is that brand's own palette.
  const brands = new Set([...collections.values()].flat().map((m) => m.toLowerCase()))
  const entries = variables.map((variable): Entry => ({
    variable, key: variable.key, words: wordsOf(variable.name), first: prefixOf(variable.name, 1), firstTwo: prefixOf(variable.name, 2),
    // Raw, single-mode colours never follow a brand switch.
    primitive: variable.type === 'COLOR' && (brands.has(prefixOf(variable.name, 1)) || (variable.values.length === 1 && !variable.values[0]?.aliasOf)),
  }))

  const modeOf = (modes: MatchContext['modes']) => [...collections].map(([name, list]) => modes[name] ?? list[0]!).join(', ')

  const hitsMemo = new Map<string, readonly Hit[]>()
  function hitsFor(input: MatchInput, modes: MatchContext['modes'], mode: string): readonly Hit[] {
    const { value, scope, opacity = 1 } = input
    const memoKey = `${scope}|${value}|${opacity}|${mode}`
    const known = hitsMemo.get(memoKey)
    if (known) return known
    const type = typeof value === 'string' ? 'COLOR' : 'FLOAT'
    const pool = entries.filter((e) => e.variable.type === type && inScope(e.variable.scopes, scope))
    const usable = pool.some((e) => !e.primitive) ? pool.filter((e) => !e.primitive) : pool
    const color = typeof value === 'string' ? parseHex(value) : null
    const hits = usable.flatMap((entry): Hit[] => {
      const text = valueIn(entry.variable, modes)
      if (text === undefined) return []
      const compared = color ? compareColor({ ...color, a: opacity }, text) : compareNumber(value as number, text, scope)
      return compared ? [{ entry, text, compared }] : []
    })
    hitsMemo.set(memoKey, hits)
    return hits
  }

  return function match(input: MatchInput): Recommendation {
    const context = input.context ?? NO_CONTEXT
    const role = input.role ?? roleOf(input.scope)
    const mode = modeOf(context.modes)
    const hits = hitsFor(input, context.modes, mode)
    const scored = hits.map((hit) => ({ hit, score: scoreOf(hit.entry, role, context) }))
    const byName = (a: Hit, b: Hit) => a.entry.variable.name.localeCompare(b.entry.variable.name)
    const label = mode ? { mode } : {}

    const exact = scored.filter((s) => s.hit.compared.kind === 'exact').sort((a, b) => b.score - a.score || byName(a.hit, b.hit))
    if (exact.length) {
      const [first, second] = exact
      const sure = first!.score >= SURE_SCORE && (!second || first!.score - second.score >= SURE_GAP - ROUNDING)
      return { match: sure ? 'exact' : 'check', candidates: exact.slice(0, MAX_EXACT).map((s) => toCandidate(s.hit)), matches: exact.length, ...label }
    }
    const closest = (list: typeof scored) => [...list].sort((a, b) => Math.round(a.hit.compared.distance) - Math.round(b.hit.compared.distance) || b.score - a.score || byName(a.hit, b.hit))
    const near = scored.filter((s) => s.hit.compared.kind === 'near')
    const list = near.length ? closest(near) : closest(scored)
    return { match: near.length ? 'near' : 'none', candidates: list.slice(0, MAX_NEAR).map((s) => toCandidate(s.hit)), matches: 0, ...label }
  }
}

export const recommend = (input: MatchInput, variables: readonly LibraryVariable[]): Recommendation => createMatcher(variables)(input)

function currentLabel(f: Finding): string {
  if (typeof f.value === 'number') return f.scope === 'FONT_WEIGHT' ? String(f.value) : `${f.value} px`
  return f.opacity !== undefined && f.opacity < 1 ? `${f.value} · ${Math.round(f.opacity * 100)}%` : f.value
}

/**
 * One group per property, value and mode. A sure recommendation also splits the group, so
 * a row is right for every layer in it; an unsure one doesn't, or a guess would show up
 * as look-alike rows.
 */
export function groupFindings(findings: readonly Finding[], variables: readonly LibraryVariable[]): MapperGroup[] {
  const match = createMatcher(variables)
  const byKey = new Map<string, { list: Finding[]; rec: Recommendation }>()
  for (const f of findings) {
    const rec = match({ value: f.value, scope: f.scope, role: roleOf(f.scope, f.target.field), ...(f.opacity !== undefined ? { opacity: f.opacity } : {}), ...(f.context ? { context: f.context } : {}) })
    const sure = rec.match === 'exact' ? rec.candidates[0]?.key : ''
    const key = `${f.property}|${currentLabel(f)}|${rec.mode ?? ''}|${sure}`
    const group = byKey.get(key)
    if (group) group.list.push(f)
    else byKey.set(key, { list: [f], rec })
  }
  const groups = [...byKey].map(([id, { list, rec }]): MapperGroup => {
    const first = list[0]!
    const layers = new Map(list.map((f) => [f.layer.id, f.layer]))
    return {
      id, category: first.category, property: first.property, value: first.value,
      ...(first.opacity !== undefined ? { opacity: first.opacity } : {}),
      current: currentLabel(first), layers: [...layers.values()], targets: list.map((f) => f.target),
      match: rec.match, candidates: rec.candidates, matches: rec.matches, ...(rec.mode ? { mode: rec.mode } : {}),
    }
  })
  return groups.sort((a, b) => KIND_RANK[a.match] - KIND_RANK[b.match]
    || CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category)
    || b.layers.length - a.layers.length
    || a.id.localeCompare(b.id))
}
