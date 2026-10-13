// Keyword retrieval over the library index: which variables and components a
// question is about. Deterministic and explainable (every hit says what matched),
// so UXAI's answers can always cite where they came from.
import type { LibraryComponent, LibraryIndex, LibraryStyle, LibraryVariable, VariableType } from './types'

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'be', 'by', 'can', 'do', 'does', 'for', 'from', 'have', 'how', 'i', 'in', 'is', 'it', 'me',
  'my', 'of', 'on', 'or', 'our', 'show', 'tell', 'that', 'the', 'their', 'there', 'this', 'to', 'use', 'used', 'uses',
  'we', 'what', 'whats', 'where', 'which', 'who', 'why', 'with', 'you', 'your', 'all', 'any', 'list', 'find', 'give', 'get',
])

/** Design-system words that are spelled differently in variable names. */
const SYNONYMS: Record<string, readonly string[]> = {
  primary: ['primary', 'accent', 'brand'],
  colour: [], color: [], colours: [], colors: [],
  background: ['background', 'bg', 'surface'],
  bg: ['bg', 'background', 'surface'],
  text: ['text', 'fg', 'foreground', 'content', 'label'],
  border: ['border', 'stroke', 'outline'],
  spacing: ['space', 'spacing', 'gap', 'padding', 'inset'],
  space: ['space', 'spacing', 'gap', 'padding', 'inset'],
  padding: ['padding', 'space', 'inset'],
  radius: ['radius', 'corner', 'rounded'],
  corner: ['corner', 'radius'],
  error: ['error', 'danger', 'critical', 'negative'],
  danger: ['danger', 'error', 'critical'],
  success: ['success', 'positive', 'good'],
  warning: ['warning', 'caution', 'attention'],
  font: ['font', 'type', 'typography', 'text'],
  typography: ['typography', 'font', 'type', 'text'],
  icon: ['icon', 'icons', 'glyph'],
  icons: ['icon', 'icons', 'glyph'],
  button: ['button', 'btn', 'cta'],
}

const COLOR_WORDS = /\b(colou?rs?|hex|fill|palette|swatch)\b/
const NUMBER_WORDS = /\b(spacing|space|padding|gap|radius|corner|size|width|height|number)\b/
const TYPE_WORDS = /\b(type|typography|font|fonts|text style|text styles|heading|headings|title|body|caption|label|line height|weight|typeface)\b/

/** Whether a question is about typography (text styles) rather than colour or components. */
export const isTypeQuestion = (query: string): boolean => TYPE_WORDS.test(query.toLowerCase())

/** Lower-case terms with stopwords and type-only words removed, each expanded by its synonyms. */
export function queryTerms(query: string): (readonly string[])[] {
  return query.toLowerCase().replace(/[’']/g, '').split(/[^a-z0-9]+/).filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .map((t) => SYNONYMS[t] ?? [t]).filter((group) => group.length > 0)
}

/** The variable type a question implies, if any ("colour" → COLOR, "spacing" → FLOAT). */
export function impliedType(query: string): VariableType | undefined {
  const q = query.toLowerCase()
  if (COLOR_WORDS.test(q)) return 'COLOR'
  if (NUMBER_WORDS.test(q)) return 'FLOAT'
  return undefined
}

const segments = (name: string) => name.toLowerCase().split(/[/\s_.-]+/).filter(Boolean)

/**
 * 3 for a whole name segment, 2 inside the name, 1 in the other text (collection, description).
 * The best synonym of each term counts in the name; only the word as typed counts in the other
 * text, so "primary" → "brand" doesn't match every variable of a "Brand UI" collection.
 */
function score(name: string, other: string, terms: readonly (readonly string[])[]): number {
  const segs = segments(name)
  const lowerName = name.toLowerCase()
  const lowerOther = other.toLowerCase()
  let total = 0
  for (const group of terms) {
    const inName = Math.max(0, ...group.map((t) => (segs.includes(t) ? 3 : lowerName.includes(t) ? 2 : 0)))
    total += inName || (lowerOther.includes(group[0]!) ? 1 : 0)
  }
  return total
}

export interface Hits<T> { items: readonly T[]; total: number }

/** Best score first; ties go to the more general item (fewer name segments, then more variants). */
const rank = <T>(scored: { item: T; score: number; depth: number }[], limit: number): Hits<T> => {
  const hits = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score || a.depth - b.depth)
  return { items: hits.slice(0, limit).map((s) => s.item), total: hits.length }
}

/** Variables a question is about, best first. A type the question implies filters the hits when any of that type match. */
export function searchVariables(index: Pick<LibraryIndex, 'variables'>, query: string, limit = 6): Hits<LibraryVariable> {
  const terms = queryTerms(query)
  const type = impliedType(query)
  const pool = type ? index.variables.filter((v) => v.type === type) : index.variables
  if (!terms.length) return { items: pool.slice(0, limit), total: pool.length }
  return rank(pool.map((item) => ({ item, score: score(item.name, `${item.collection} ${item.description}`, terms), depth: segments(item.name).length })), limit)
}

/** Components a question is about, best first. */
export function searchComponents(index: Pick<LibraryIndex, 'components'>, query: string, limit = 5): Hits<LibraryComponent> {
  const terms = queryTerms(query)
  if (!terms.length) return { items: index.components.slice(0, limit), total: index.components.length }
  return rank(index.components.map((item) => ({ item, score: score(item.name, `${item.location} ${item.description}`, terms), depth: -item.variants })), limit)
}

/** Styles a question is about, best first. Type words pick text styles, colour words colour styles; otherwise both. */
export function searchStyles(index: Pick<LibraryIndex, 'styles'>, query: string, limit = 8): Hits<LibraryStyle> {
  const all = index.styles ?? []
  const q = query.toLowerCase()
  const pool = isTypeQuestion(q) && !COLOR_WORDS.test(q) ? all.filter((s) => s.kind === 'text') : COLOR_WORDS.test(q) && !isTypeQuestion(q) ? all.filter((s) => s.kind === 'color') : all
  const terms = queryTerms(query)
  if (!terms.length) return { items: pool.slice(0, limit), total: pool.length }
  const ranked = rank(pool.map((item) => ({ item, score: score(item.name, item.description, terms), depth: segments(item.name).length })), limit)
  // "Which text styles do we have?" names no style: the whole ramp is the answer. A colour question that matches nothing stays unmatched.
  return ranked.total || !isTypeQuestion(q) ? ranked : { items: pool.slice(0, limit), total: pool.length }
}
