// Accessibility agent: WCAG 2.2 contrast (text and non-text), target size, text
// alternatives and text spacing, over the inventory, in every requested brand mode.
import type { RGB } from '@shared/figma/color'
import type { AgentFinding } from '../messages'
import type { Inventory, NodeInfo, TextInfo } from '../sandbox/inventory'
import { finding, groupFindings, isLargeText, nearestPassing, neededRatio, plural, ratio, ruleOn, truncate, WCAG, type PaletteEntry, type RuleContext } from './shared'

export interface BrandModeColors {
  /** Mode name → the palette resolved in that mode (text-capable entries first). */
  modes: readonly string[]
  /** variableId → mode → colour. */
  colorIn: (variableId: string | undefined, mode: string) => RGB | null
  /** Palette entries in a mode, for fix suggestions. */
  paletteIn: (mode: string) => readonly PaletteEntry[]
  activeMode: string
}

export const A11Y_RULES = ['1.4.3', '1.4.11', '2.5.8', '1.4.12', '2.4.7', '1.1.1', '1.4.6'] as const

const textCandidates = (palette: readonly PaletteEntry[]) => {
  const scoped = palette.filter((e) => e.scopes.includes('ALL_SCOPES') || e.scopes.includes('TEXT_FILL'))
  if (scoped.length) return scoped
  const named = palette.filter((e) => /(^|\/)(text|type|fg|foreground|on-|label)/i.test(e.name))
  return named.length ? named : palette
}

const modeNote = (mode: string, active: string) => (mode === active ? '' : ` · ${mode} mode`)

function contrastFindings(inv: Inventory, ctx: RuleContext, brand: BrandModeColors | null): AgentFinding[] {
  const out: AgentFinding[] = []
  const modes = brand && brand.modes.length ? brand.modes : ['current']
  for (const t of inv.texts) {
    if (!t.backdrop || t.opacity === 0) continue
    for (const run of t.runs) {
      if (!run.fill || run.fontSize <= 0) continue
      for (const mode of modes) {
        // A raw colour reads the same in every mode; a bound one takes the mode's value. A pair with no token
        // on either side is judged once, in the active mode.
        const active = !brand || mode === 'current' || mode === brand.activeMode
        if (!active && !run.fill.variableId && !t.backdrop.variableId) continue
        const fg = brand && mode !== 'current' && run.fill.variableId ? brand.colorIn(run.fill.variableId, mode) ?? (active ? run.fill.rgb : null) : run.fill.rgb
        const bg = brand && mode !== 'current' && t.backdrop.variableId ? brand.colorIn(t.backdrop.variableId, mode) ?? (active ? t.backdrop.rgb : null) : t.backdrop.rgb
        if (!fg || !bg) continue
        const r = ratio(fg, bg)
        const aa = neededRatio(run.fontSize, run.fontWeight)
        const aaa = neededRatio(run.fontSize, run.fontWeight, true)
        const failsAA = r < aa
        const failsAAA = !failsAA && r < aaa
        if (!failsAA && !(failsAAA && ruleOn(ctx, '1.4.6'))) continue
        if (failsAA && !ruleOn(ctx, '1.4.3')) continue
        const needed = failsAA ? aa : aaa
        const palette = brand ? textCandidates(brand.paletteIn(mode === 'current' ? brand.activeMode : mode)) : []
        const fix = nearestPassing(fg, bg, needed, palette)
        const where = `${t.path}${modeNote(mode, brand?.activeMode ?? 'current')}${t.backdrop.assumed ? ' · backdrop assumed white' : ''}`
        out.push(finding('accessibility', ctx, {
          rule: failsAA ? '1.4.3' : '1.4.6',
          severity: failsAA ? (r < aa - 1.5 ? 'critical' : 'serious') : 'minor',
          title: `“${truncate(run.characters, 32)}” is ${r}:1 on ${t.backdrop.hex.toUpperCase()} — needs ${needed}:1${isLargeText(run.fontSize, run.fontWeight) ? ' (large text)' : ''}`,
          meta: `WCAG ${failsAA ? '1.4.3' : '1.4.6'} · ${where}`,
          nodeId: t.id,
          fix: fix ? { kind: 'rebind-fill', variableId: fix.id, variableName: fix.name } : (run.fill.variableName ? { kind: 'manual', note: `Change ${run.fill.variableName} or the backdrop so the pair reaches ${needed}:1` } : null),
          fixLabel: fix ? `Fix: ${run.fill.variableName ?? run.fill.hex.toUpperCase()} → ${fix.name} (${fix.ratio}:1)` : null,
          fixable: Boolean(fix) && !t.inInstance,
        }))
      }
    }
  }
  return out
}

function nonTextFindings(inv: Inventory, ctx: RuleContext, brand: BrandModeColors | null): AgentFinding[] {
  if (!ruleOn(ctx, '1.4.11')) return []
  const out: AgentFinding[] = []
  for (const n of inv.nodes) {
    if (!n.stroke || !n.backdrop || n.strokeWeight <= 0) continue
    if (/\b(divider|separator|decor|ornament|rule)\b/i.test(n.name)) continue
    // A filled control's boundary is its fill; only a stroke doing the job alone is judged.
    const own = n.fills.find((f) => f.alpha >= 1)
    if (own && ratio(own.rgb, n.backdrop.rgb) >= WCAG.NON_TEXT) continue
    const r = ratio(n.stroke.rgb, n.backdrop.rgb)
    if (r >= WCAG.NON_TEXT) continue
    const palette = brand ? brand.paletteIn(brand.activeMode).filter((e) => e.scopes.includes('ALL_SCOPES') || e.scopes.includes('STROKE_COLOR') || /border|stroke|outline/i.test(e.name)) : []
    const fix = nearestPassing(n.stroke.rgb, n.backdrop.rgb, WCAG.NON_TEXT, palette)
    out.push(finding('accessibility', ctx, {
      rule: '1.4.11', severity: r < 2 ? 'serious' : 'moderate',
      title: `${n.name} border is ${r}:1 against ${n.backdrop.hex.toUpperCase()} — needs 3:1`,
      meta: `WCAG 1.4.11 · ${n.path}`,
      nodeId: n.id,
      fix: fix ? { kind: 'rebind-stroke', variableId: fix.id, variableName: fix.name } : null,
      fixLabel: fix ? `Fix: ${n.stroke.variableName ?? n.stroke.hex.toUpperCase()} → ${fix.name} (${fix.ratio}:1)` : null,
      fixable: Boolean(fix) && !n.inInstance,
    }))
  }
  return out
}

const CONTROL_NAME = /\b(button|btn|cta|toggle|switch|checkbox|radio|tab|chip|link|icon button|close|menu item|option|slider|stepper)\b/i

function targetFindings(inv: Inventory, ctx: RuleContext): AgentFinding[] {
  if (!ruleOn(ctx, '2.5.8')) return []
  const out: AgentFinding[] = []
  const candidates = inv.nodes.filter((n) => (n.interactive || (n.isInstance && CONTROL_NAME.test(n.mainName ?? n.name))) && !n.inInstance)
  for (const n of candidates) {
    const small = Math.min(n.width, n.height)
    if (small >= WCAG.TARGET) continue
    const w = Math.round(n.width * 10) / 10
    const h = Math.round(n.height * 10) / 10
    out.push(finding('accessibility', ctx, {
      rule: '2.5.8', severity: small < 16 ? 'serious' : 'moderate',
      title: `${n.name} is ${w}×${h} — targets need 24×24 (or clear space around them)`,
      meta: `WCAG 2.5.8 · ${n.path}`,
      nodeId: n.id,
      fix: { kind: 'resize', width: Math.max(n.width, WCAG.TARGET), height: Math.max(n.height, WCAG.TARGET) },
      fixLabel: `Fix: grow the hit area to ${Math.max(Math.ceil(n.width), WCAG.TARGET)}×${Math.max(Math.ceil(n.height), WCAG.TARGET)}`,
      // Resizing changes layout; offered, never auto-applied.
      fixable: false,
    }))
  }
  return out
}

function textSpacingFindings(inv: Inventory, ctx: RuleContext): AgentFinding[] {
  if (!ruleOn(ctx, '1.4.12')) return []
  const out: AgentFinding[] = []
  for (const t of inv.texts) {
    // Fixed-size boxes that already truncate have no room for 1.5× line height / wider letters.
    if (t.autoResize !== 'NONE' && !t.truncates) continue
    if (t.characters.length < 12) continue
    if (!(t.truncates || (t.autoResize === 'NONE' && t.height < t.fontSize * 1.5 * Math.max(1, Math.ceil((t.characters.length * t.fontSize * 0.5) / Math.max(t.width, 1)))))) continue
    out.push(finding('accessibility', ctx, {
      rule: '1.4.12', severity: 'moderate',
      title: `“${truncate(t.characters, 32)}” has no room for 1.5× line height — it ${t.truncates ? 'truncates' : 'sits in a fixed box'}`,
      meta: `WCAG 1.4.12 · ${t.path}`,
      nodeId: t.id,
      fix: { kind: 'manual', note: 'Let the text box grow (Auto height) or allow more lines' },
      fixLabel: 'Fix: set the text to Auto height',
      fixable: false,
    }))
  }
  return out
}

function textAlternativeFindings(inv: Inventory, ctx: RuleContext): AgentFinding[] {
  if (!ruleOn(ctx, '1.1.1')) return []
  const out: AgentFinding[] = []
  for (const n of inv.nodes) {
    if (n.inInstance) continue
    const image = n.hasImageFill
    const icon = /\b(icon|glyph|logo|illustration|avatar)\b/i.test(n.mainName ?? n.name) && (n.isInstance || n.type === 'VECTOR' || n.type === 'BOOLEAN_OPERATION')
    if (!image && !icon) continue
    // A name that says what it shows is the alternative a developer will read; "Image", "Rectangle 12" is not.
    const generic = /^(image|img|picture|photo|rectangle|frame|group|vector|icon|ellipse|logo|avatar|illustration)(\s*\d+)?$/i.test(n.name.trim())
    if (!generic) continue
    out.push(finding('accessibility', ctx, {
      rule: '1.1.1', severity: image ? 'moderate' : 'minor',
      title: `${n.name} has no text alternative — name the layer for what it shows`,
      meta: `WCAG 1.1.1 · ${n.path}`,
      nodeId: n.id,
      fix: { kind: 'manual', note: 'Rename the layer (e.g. "Product photo: blue sofa") or add a Dev Mode annotation with the alt text' },
      fixLabel: 'Fix: name it for what it shows',
      fixable: false,
    }))
  }
  return out
}

function focusFindings(inv: Inventory, ctx: RuleContext): AgentFinding[] {
  if (!ruleOn(ctx, '2.4.7')) return []
  // Component sets in scope whose variants carry no Focus state.
  const sets = inv.nodes.filter((n) => n.type === 'COMPONENT_SET' && CONTROL_NAME.test(n.name))
  return sets.map((set) => finding('accessibility', ctx, {
    rule: '2.4.7', severity: 'moderate',
    title: `${set.name} may lack a focus state — check its variants for a Focus / Focused state`,
    meta: `WCAG 2.4.7 · ${set.path} · ${plural(set.childrenCount, 'variant')}`,
    nodeId: set.id,
    fix: { kind: 'manual', note: 'Add a Focus variant with a 3:1 ring' },
    fixLabel: null, fixable: false,
  }))
}

export interface A11yReport { findings: AgentFinding[]; checked: number }

export function accessibilityFindings(inv: Inventory, ctx: RuleContext, brand: BrandModeColors | null): A11yReport {
  const findings = [
    ...contrastFindings(inv, ctx, brand),
    ...nonTextFindings(inv, ctx, brand),
    ...targetFindings(inv, ctx),
    ...textSpacingFindings(inv, ctx),
    ...textAlternativeFindings(inv, ctx),
    ...focusFindings(inv, ctx),
  ]
  const checked = inv.texts.length + inv.nodes.filter((n) => n.stroke || n.interactive || n.hasImageFill).length
  return { findings: groupFindings(findings), checked }
}

export type { TextInfo, NodeInfo }
