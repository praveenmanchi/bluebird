// Localization agent: text expansion into German, French and Arabic against fixed
// boxes, right-to-left mirroring, and locale-specific formats typed into the copy.
// Expansion factors follow the W3C / IBM pseudo-localisation table (see
// docs/research/ux-ai-agents-research.md §5).
import type { AgentFinding } from '../messages'
import type { Inventory, TextInfo } from '../sandbox/inventory'
import { finding, groupFindings, ruleOn, truncate, type RuleContext } from './shared'

export const L10N_RULES = ['expansion', 'rtl', 'formats', 'concatenation'] as const

export interface Locale { code: string; name: string; /** Width growth of a typical string (1.3 = +30%). */ factor: number; rtl?: boolean }

export const LOCALES: readonly Locale[] = [
  { code: 'de', name: 'German', factor: 1.35 },
  { code: 'fr', name: 'French', factor: 1.25 },
  { code: 'ar', name: 'Arabic', factor: 1.25, rtl: true },
]

/** Short strings grow far more than long ones: ≤10 chars up to 3×, 11–20 2×, 21–30 1.8×, 31–50 1.6×, 51–70 1.5×, longer 1.3×. */
export function expansion(length: number, locale: Locale): number {
  const table = length <= 10 ? 2.4 : length <= 20 ? 1.9 : length <= 30 ? 1.7 : length <= 50 ? 1.55 : length <= 70 ? 1.45 : 1.3
  // The table is the worst case across languages; a locale's own factor scales it towards its typical growth.
  return 1 + (table - 1) * (locale.factor - 1) / 0.35
}

/** Average glyph width as a share of the font size, per weight class. */
const GLYPH = 0.52

/** Estimated rendered width of a single line of text in px. */
export const estimateWidth = (text: string, fontSize: number): number => text.length * fontSize * GLYPH

const DIRECTIONAL = /\b(arrow|chevron|back|forward|next|previous|prev|caret|pointer|undo|redo|reply|indent|outdent|progress|slider|stepper|breadcrumb)\b/i
const DATE = /\b(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/(\d{2}|\d{4})\b/
const MONEY = /(^|\s)[$£€]\s?\d[\d,]*(\.\d+)?\b|\b\d[\d,]*(\.\d+)?\s?(USD|EUR|GBP)\b/
const US_UNITS = /\b\d+(\.\d+)?\s?(mi|miles|lb|lbs|oz|°F|ft|in\b)/i
const TIME_12H = /\b(1[0-2]|0?[1-9])(:[0-5]\d)?\s?(am|pm)\b/i
const CONCAT = /^(you have|there (is|are)|showing|selected|items?|results?|of \d+|\d+ (items?|results?|files?|minutes?|hours?|days?))$/i

export interface L10nReport { findings: AgentFinding[]; checked: number }

/** Texts whose box can't take the growth. Auto-width texts grow on their own; fixed and auto-height boxes are judged. */
export function overflowRisk(t: TextInfo): { locale: Locale; estimated: number; available: number }[] {
  if (t.autoResize === 'WIDTH_AND_HEIGHT' || t.characters.length < 2) return []
  const single = !t.characters.includes('\n') && (t.maxLines === 1 || t.truncates || t.autoResize === 'NONE' && t.height < t.fontSize * 2.2)
  if (!single) return []
  const base = estimateWidth(t.characters, t.fontSize)
  // The box may already be wider than the text; what matters is the room left.
  const available = Math.max(t.width, base)
  return LOCALES.map((locale) => ({ locale, estimated: base * expansion(t.characters.length, locale), available })).filter((r) => r.estimated > r.available * 1.02)
}

export function localizationFindings(inv: Inventory, ctx: RuleContext): L10nReport {
  const out: AgentFinding[] = []
  for (const t of inv.texts) {
    if (ruleOn(ctx, 'expansion')) {
      const risks = overflowRisk(t)
      const worst = risks.sort((a, b) => b.estimated / b.available - a.estimated / a.available)[0]
      if (worst) {
        const pct = Math.round((worst.estimated / worst.available - 1) * 100)
        out.push(finding('localization', ctx, {
          rule: 'expansion', severity: pct > 40 ? 'serious' : 'moderate',
          title: `“${truncate(t.characters, 32)}” may overflow in ${risks.map((r) => r.locale.name).join(', ')} (${worst.locale.name} needs about ${pct}% more width)`,
          meta: `Text expansion · ${t.path} · ${Math.round(t.width)}px box${t.truncates ? ', truncates' : ''}`,
          nodeId: t.id,
          fix: { kind: 'manual', note: 'Let the text wrap (Auto height, more lines) or give the box room to grow' },
          fixLabel: 'Fix: allow wrapping or a wider box', fixable: false,
        }))
      }
    }
    const s = t.characters
    if (ruleOn(ctx, 'formats')) {
      const which = DATE.test(s) ? 'a US date' : MONEY.test(s) ? 'a currency amount' : US_UNITS.test(s) ? 'imperial units' : TIME_12H.test(s) ? 'a 12-hour time' : null
      if (which) {
        out.push(finding('localization', ctx, {
          rule: 'formats', severity: 'minor',
          title: `“${truncate(s, 32)}” hard-codes ${which} — formats change per locale`,
          meta: `Locale formats · ${t.path}`,
          nodeId: t.id,
          fix: { kind: 'manual', note: 'Mark it as a formatted value (date / number / currency) in the handoff' },
          fixLabel: null, fixable: false,
        }))
      }
    }
    if (ruleOn(ctx, 'concatenation') && CONCAT.test(s.trim()) && !t.inInstance) {
      out.push(finding('localization', ctx, {
        rule: 'concatenation', severity: 'minor',
        title: `“${truncate(s, 32)}” looks like a sentence fragment — word order changes in other languages`,
        meta: `String concatenation · ${t.path}`,
        nodeId: t.id,
        fix: { kind: 'manual', note: 'Write the whole sentence in one layer with a placeholder, e.g. “Showing {count} results”' },
        fixLabel: null, fixable: false,
      }))
    }
  }
  if (ruleOn(ctx, 'rtl')) {
    for (const n of inv.nodes) {
      if (n.inInstance || !DIRECTIONAL.test(n.mainName ?? n.name) || n.type === 'TEXT') continue
      if (!(n.isInstance || n.type === 'VECTOR' || n.type === 'BOOLEAN_OPERATION' || /\b(icon|glyph)\b/i.test(n.name))) continue
      out.push(finding('localization', ctx, {
        rule: 'rtl', severity: 'minor',
        title: `${n.mainName ?? n.name} is directional — mirror it for right-to-left (Arabic)`,
        meta: `RTL · ${n.path}`,
        nodeId: n.id,
        fix: { kind: 'manual', note: 'Mirror the icon horizontally in the RTL variant; numbers and media controls stay as they are' },
        fixLabel: null, fixable: false,
      }))
    }
  }
  return { findings: groupFindings(out), checked: Math.max(inv.texts.length, 1) }
}
