// Orders variables that share a value. Measured on real files by hiding bindings and
// checking the ranker picks them again: value alone is close to random, names and
// layer paths reach 39%, and what neighbouring layers use reaches 86%. Page-wide
// usage made it worse, because popular variables beat the right one.
import type { MatchContext, ValueScope } from './messages'

/** Words that say a variable is meant for this kind of property. */
const ROLE_WORDS: Readonly<Record<string, readonly string[]>> = {
  TEXT_FILL: ['fg', 'text', 'label', 'title', 'foreground', 'value', 'on'],
  FRAME_FILL: ['bg', 'surface', 'background', 'fill'],
  SHAPE_FILL: ['bg', 'surface', 'background', 'fill', 'icon', 'track'],
  STROKE_COLOR: ['border', 'stroke', 'divider', 'outline'],
  GAP: ['gap', 'stack', 'space', 'padding', 'inset'],
  gap: ['gap', 'stack', 'space'],
  padding: ['padding', 'inset', 'space'],
  CORNER_RADIUS: ['radius'],
  STROKE_FLOAT: ['width', 'stroke', 'border'],
  FONT_SIZE: ['size', 'font', 'text', 'type'],
  FONT_WEIGHT: ['weight', 'font', 'type'],
  LINE_HEIGHT: ['line', 'height', 'leading'],
  LETTER_SPACING: ['letter', 'spacing', 'tracking'],
  PARAGRAPH_SPACING: ['paragraph', 'spacing'],
}
/** A variable naming one of these is for that state, so it needs the layer to say so too. */
const STATE_WORDS: ReadonlySet<string> = new Set(['hover', 'hovered', 'pressed', 'active', 'disabled', 'focus', 'focused', 'selected', 'error', 'danger', 'success', 'warning', 'inverse'])

const ROLE_FIT = 3
const WRONG_STATE = -3
const WORD_HIT = 2
const MAX_WORD_HITS = 4
const NEAR_WORDS = 6
const DEFAULT_BONUS = 0.5
const LENGTH_COST = 0.05
const NAMESPACE_WEIGHT = 6
const SAME_USE_WEIGHT = 3
/** Fewer bindings than this nearby says nothing about the surroundings. */
const MIN_NEIGHBOURS = 3

export const wordsOf = (text: string): readonly string[] => text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean)

export const prefixOf = (name: string, segments: number): string => name.toLowerCase().split('/').slice(0, segments).join('/')

export interface Rankable { key: string; words: readonly string[]; first: string; firstTwo: string }

/** The role a property plays: gap and padding share a scope but not their variables. */
export function roleOf(scope: ValueScope, field?: string): string {
  if (field === 'itemSpacing' || field === 'counterAxisSpacing') return 'gap'
  if (field?.startsWith('padding')) return 'padding'
  return scope
}

function nameScore(v: Rankable, role: string, words: readonly string[]): number {
  const near = new Set(words.slice(-NEAR_WORDS))
  const far = new Set(words)
  const roleWords = ROLE_WORDS[role] ?? []
  let fits = false
  let wrongState = false
  let hits = 0
  for (const w of v.words) {
    if (roleWords.includes(w)) fits = true
    else if (STATE_WORDS.has(w) && !far.has(w)) wrongState = true
    else if (STATE_WORDS.has(w) || near.has(w)) hits += WORD_HIT
    else if (far.has(w)) hits += 1
  }
  return (fits ? ROLE_FIT : 0) + (wrongState ? WRONG_STATE : 0) + WORD_HIT * Math.min(hits, MAX_WORD_HITS)
    + (v.words.includes('default') ? DEFAULT_BONUS : 0) - LENGTH_COST * v.words.length
}

function neighbourScore(v: Rankable, role: string, context: MatchContext): number {
  const nearest = context.neighbours.find((n) => n.total >= MIN_NEIGHBOURS)
  if (!nearest) return 0
  const share = (count: number | undefined) => (count ?? 0) / nearest.total
  return NAMESPACE_WEIGHT * share(nearest.first.get(v.first)) + NAMESPACE_WEIGHT * share(nearest.firstTwo.get(v.firstTwo))
    + SAME_USE_WEIGHT * Math.log2(1 + (nearest.uses.get(`${v.key}|${role}`) ?? 0))
}

export const scoreOf = (v: Rankable, role: string, context: MatchContext): number =>
  nameScore(v, role, context.words) + neighbourScore(v, role, context)
