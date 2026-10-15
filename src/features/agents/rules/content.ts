// Content agent: placeholder copy, fake people and placeholder images, found by
// pattern; the model (if configured) then proposes realistic replacements.
import type { AgentFinding } from '../messages'
import type { Inventory, TextInfo } from '../sandbox/inventory'
import { finding, ruleOn, truncate, type RuleContext } from './shared'

export const CONTENT_RULES = ['placeholder-text', 'fake-names', 'placeholder-images', 'placeholder-data'] as const

const LOREM = /\b(lorem ipsum|dolor sit amet|consectetur|adipiscing|eiusmod|tempor incididunt)\b/i
const FILLER = /^(text|label|title|heading|headline|button|body|caption|description|subtitle|placeholder|tbd|tba|todo|xxx+|asdf|test|lorem|ipsum|insert .* here|.* goes here|your text here|type something|sample text|enter text)[.!…]?$/i
const FAKE_PEOPLE = /\b(john|jane) (doe|smith|appleseed)\b|\bjohn q\. public\b|\btest (user|person|account)\b|\bfirst ?name last ?name\b|\bfull name\b|\busername\b/i
const FAKE_DATA = /@(example|test|email|domain)\.(com|org|net)\b|\b555[- ]?\d{3}[- ]?\d{4}\b|\b(xxx|###|000)[-\s]?(xxx|###|000)\b|\b0{3,}\b|\b123 (main|anywhere|example) st(reet)?\b|\b12345\b/i

export interface ContentHit { text: TextInfo; rule: (typeof CONTENT_RULES)[number]; why: string }

/** Texts that read as placeholders, with the rule they break. Pure. */
export function placeholderTexts(inv: Inventory): ContentHit[] {
  const hits: ContentHit[] = []
  for (const t of inv.texts) {
    const s = t.characters.trim()
    if (LOREM.test(s)) hits.push({ text: t, rule: 'placeholder-text', why: 'Lorem ipsum' })
    else if (FILLER.test(s) && t.role !== 'placeholder') hits.push({ text: t, rule: 'placeholder-text', why: 'Filler text' })
    else if (FAKE_PEOPLE.test(s)) hits.push({ text: t, rule: 'fake-names', why: 'Fake name' })
    else if (FAKE_DATA.test(s)) hits.push({ text: t, rule: 'placeholder-data', why: 'Placeholder data' })
  }
  return hits
}

export interface ContentReport { findings: AgentFinding[]; checked: number; hits: ContentHit[] }

/** `suggestions` maps a text layer id to the replacement the model proposed (added after the model answers). */
export function contentFindings(inv: Inventory, ctx: RuleContext, suggestions: ReadonlyMap<string, string> = new Map()): ContentReport {
  const hits = placeholderTexts(inv).filter((h) => ruleOn(ctx, h.rule))
  const out: AgentFinding[] = hits.map((h) => {
    const suggestion = suggestions.get(h.text.id)
    return finding('content', ctx, {
      rule: h.rule,
      severity: h.rule === 'placeholder-text' && LOREM.test(h.text.characters) ? 'serious' : 'moderate',
      title: `${h.why}: “${truncate(h.text.characters, 40)}”`,
      meta: `${h.why} · ${h.text.path}${h.text.inInstance ? ' · inside an instance' : ''}`,
      nodeId: h.text.id,
      fix: suggestion ? { kind: 'replace-text', text: suggestion } : { kind: 'manual', note: 'Write real copy for this layer' },
      fixLabel: suggestion ? `Fix: “${truncate(suggestion, 48)}”` : null,
      fixable: Boolean(suggestion),
    })
  })
  if (ruleOn(ctx, 'placeholder-images')) {
    for (const n of inv.nodes) {
      if (n.inInstance) continue
      const named = /\b(image|img|photo|picture|thumbnail|placeholder|hero|cover|avatar)\b/i.test(n.name)
      const grey = n.fills.length === 1 && !n.hasImageFill && isGrey(n.fills[0]!.rgb) && n.childrenCount === 0 && n.width >= 40 && n.height >= 40
      if (!(named && (grey || (!n.hasImageFill && n.fills.length === 0 && n.childrenCount === 0)))) continue
      out.push(finding('content', ctx, {
        rule: 'placeholder-images', severity: 'minor',
        title: `${n.name} is a placeholder image (${Math.round(n.width)}×${Math.round(n.height)} grey box)`,
        meta: `Placeholder images · ${n.path}`,
        nodeId: n.id,
        fix: { kind: 'manual', note: 'Drop in a real asset or an illustrative placeholder from the library' },
        fixLabel: null, fixable: false,
      }))
    }
  }
  return { findings: out, checked: Math.max(inv.texts.length, 1), hits }
}

const isGrey = (c: { r: number; g: number; b: number }) => Math.abs(c.r - c.g) < 0.04 && Math.abs(c.g - c.b) < 0.04 && c.r > 0.5 && c.r < 0.95
