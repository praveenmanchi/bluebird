// The model-backed reviews: Spelling & grammar, UX writing, and Content's realistic
// replacements. Prompts in, JSON out; everything here is pure apart from the one
// `complete` call the sandbox makes with the prompt this file builds.
import { extractArray } from '@shared/ai'
import type { FindingSeverity } from '@shared/ui'
import type { AgentFinding, AgentId } from '../messages'
import type { TextInfo } from '../sandbox/inventory'
import { finding, truncate, type RuleContext } from './shared'

export const SPELLING_RULES = ['spelling', 'grammar', 'terminology'] as const
export const WRITING_RULES = ['sentence-case', 'button-verbs', 'error-messages', 'clarity', 'tone'] as const

/** How much text one request carries; a page with more is reviewed in batches. */
export const BATCH_TEXTS = 60
export const BATCH_CHARS = 6000
export const MAX_REVIEW_TEXTS = 240

export interface ReviewItem { index: number; id: string; text: string; role: string; path: string }

/** Distinct, non-trivial texts (same string once), oldest first, capped. */
export function reviewItems(texts: readonly TextInfo[]): ReviewItem[] {
  const seen = new Set<string>()
  const items: ReviewItem[] = []
  for (const t of texts) {
    const s = t.characters.trim()
    if (s.length < 2 || /^[\d\s.,:;%$€£+\-–—/()#*]+$/.test(s)) continue
    const key = s.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    items.push({ index: items.length, id: t.id, text: s.slice(0, 600), role: t.role, path: t.path })
    if (items.length >= MAX_REVIEW_TEXTS) break
  }
  return items
}

/** Items split so each request stays within BATCH_TEXTS and BATCH_CHARS. */
export function batches(items: readonly ReviewItem[]): ReviewItem[][] {
  const out: ReviewItem[][] = []
  let current: ReviewItem[] = []
  let chars = 0
  for (const item of items) {
    if (current.length && (current.length >= BATCH_TEXTS || chars + item.text.length > BATCH_CHARS)) { out.push(current); current = []; chars = 0 }
    current.push(item)
    chars += item.text.length
  }
  if (current.length) out.push(current)
  return out
}

const COMMON = [
  'You review the text layers of a Figma design. You receive a JSON array of items {index, text, role, path}; role is what the text is for (button, heading, label, error, helper, link, body).',
  'Reply with JSON only: an object {"findings": [...]}. Each finding: {"index": number, "rule": string, "severity": "critical"|"serious"|"moderate"|"minor", "issue": string (one sentence, what is wrong), "suggestion": string|null (the full corrected text for that layer, ready to paste, or null when the fix needs a human)}.',
  'Report only real problems. Never invent facts, names, prices or legal terms; keep the meaning, length and placeholders ({…}, %s) of the original. Product names, brand names and proper nouns are correct as written. If nothing is wrong, return {"findings": []}.',
]

export function systemPromptFor(agent: AgentId, instructions: string, rules: ReadonlySet<string>, locale = 'en-GB'): string {
  const on = (rule: string) => rules.size === 0 || rules.has(rule)
  const lines = [...COMMON]
  if (agent === 'spelling') {
    lines.push(`You are a ${locale} copy editor. Rules you check:`)
    if (on('spelling')) lines.push(`- "spelling": misspellings and ${locale} spelling (colour, organise, centre). severity moderate; a typo in a heading or button is serious.`)
    if (on('grammar')) lines.push('- "grammar": agreement, articles, apostrophes (its/it’s), punctuation, doubled words. severity moderate; minor for punctuation.')
    if (on('terminology')) lines.push('- "terminology": the same concept named two ways across the items (Sign in / Log in, Colour / Color). severity minor; suggestion = the variant used most.')
  } else if (agent === 'writing') {
    lines.push('You are a UX writer checking microcopy against a plain, friendly, confident voice. Rules you check:')
    if (on('sentence-case')) lines.push('- "sentence-case": titles, buttons and labels in Title Case or ALL CAPS (acronyms excepted). severity minor.')
    if (on('button-verbs')) lines.push('- "button-verbs": a button (role button) that does not start with a verb saying what happens (Submit, OK, Click here, Yes). severity moderate; suggestion = a specific verb phrase, 1–3 words.')
    if (on('error-messages')) lines.push('- "error-messages": an error (role error) that does not say what happened and what to do next, or blames the user. severity moderate.')
    if (on('clarity')) lines.push('- "clarity": jargon, double negatives, sentences over 20 words, vague labels (Settings 2, Misc). severity minor.')
    if (on('tone')) lines.push('- "tone": exclamation marks, shouting, passive voice, apologising, humour in errors. severity minor.')
  } else {
    lines.push('You are a content designer replacing placeholder copy. For every item write realistic, specific copy a real product would ship for that role and context (the path tells you where it sits): real-sounding but clearly fictional names (never real people), plausible products, dates and amounts. Keep the length close to the original so the layout holds. rule = "placeholder". severity moderate. Always give a suggestion.')
  }
  if (instructions) lines.push(`The design-system team’s instructions:\n${instructions}`)
  return lines.join('\n')
}

export interface ReviewRow { index: number; rule: string; severity: FindingSeverity; issue: string; suggestion: string | null }

const SEVERITIES = new Set<FindingSeverity>(['critical', 'serious', 'moderate', 'minor'])

/** The model's reply as rows that point at real items; anything malformed is dropped. */
export function parseReview(text: string, items: readonly ReviewItem[], allowedRules: readonly string[]): ReviewRow[] {
  const rows: ReviewRow[] = []
  for (const raw of extractArray(text)) {
    const index = typeof raw.index === 'number' ? raw.index : Number(raw.index)
    const item = items.find((i) => i.index === index)
    if (!item) continue
    const rule = String(raw.rule ?? '').trim()
    const severity = SEVERITIES.has(raw.severity as FindingSeverity) ? raw.severity as FindingSeverity : 'moderate'
    const issue = String(raw.issue ?? '').trim()
    if (!issue) continue
    const suggestion = typeof raw.suggestion === 'string' && raw.suggestion.trim() && raw.suggestion.trim() !== item.text ? raw.suggestion.trim() : null
    rows.push({ index, rule: allowedRules.includes(rule) ? rule : (allowedRules[0] ?? rule), severity, issue, suggestion })
  }
  return rows
}

const RULE_LABEL: Record<string, string> = {
  spelling: 'Spelling', grammar: 'Grammar', terminology: 'Terminology',
  'sentence-case': 'Sentence case', 'button-verbs': 'Button verbs', 'error-messages': 'Error messages', clarity: 'Clarity', tone: 'Voice & tone',
  placeholder: 'Placeholder text',
}

export function reviewFindings(agent: AgentId, ctx: RuleContext, rows: readonly ReviewRow[], items: readonly ReviewItem[], texts: readonly TextInfo[]): AgentFinding[] {
  const byId = new Map(texts.map((t) => [t.id, t]))
  return rows.flatMap((row) => {
    const item = items.find((i) => i.index === row.index)
    const text = item && byId.get(item.id)
    if (!item || !text) return []
    // The same string may sit on several layers; the fix reaches all of them.
    const twins = texts.filter((t) => t.characters.trim().toLowerCase() === item.text.toLowerCase()).map((t) => t.id)
    return [finding(agent, ctx, {
      rule: row.rule, severity: row.severity,
      title: row.issue.endsWith('.') ? row.issue.slice(0, -1) : row.issue,
      meta: `${RULE_LABEL[row.rule] ?? row.rule} · ${text.path}${twins.length > 1 ? ` · ${twins.length} layers` : ''}`,
      nodeId: text.id, nodeIds: twins,
      fix: row.suggestion ? { kind: 'replace-text', text: row.suggestion } : { kind: 'manual', note: row.issue },
      fixLabel: row.suggestion ? `Fix: “${truncate(row.suggestion, 56)}”` : null,
      fixable: Boolean(row.suggestion),
    })]
  })
}

export const userMessageFor = (items: readonly ReviewItem[]): string => `Items:\n${JSON.stringify(items.map(({ index, text, role, path }) => ({ index, text, role, path })))}`
