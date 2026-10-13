// Design system agent: raw colours, off-scale spacing and radii, detached instances
// and unstyled text, each with the Brand UI token that would replace the raw value.
import type { AgentFinding } from '../messages'
import type { Inventory } from '../sandbox/inventory'
import { finding, groupFindings, nearestColor, plural, ruleOn, truncate, type PaletteEntry, type RuleContext } from './shared'

export const DS_RULES = ['detached', 'raw-colour', 'off-scale', 'raw-radius', 'unstyled-text'] as const

export interface DsPalette {
  colors: readonly PaletteEntry[]
  numbers: readonly { id: string; name: string; value: number; scopes: readonly string[] }[]
}

/** Spacing on a 4px grid passes even unbound; anything else is off the scale. */
export const GRID = 4
const onGrid = (n: number) => Math.abs(n / GRID - Math.round(n / GRID)) < 1e-6

const spacingTokens = (p: DsPalette) => p.numbers.filter((n) => n.scopes.includes('GAP') || n.scopes.includes('ALL_SCOPES') || /space|spacing|gap|inset|padding/i.test(n.name))
const radiusTokens = (p: DsPalette) => p.numbers.filter((n) => n.scopes.includes('CORNER_RADIUS') || n.scopes.includes('ALL_SCOPES') || /radius|corner|rounded/i.test(n.name))
const exact = (tokens: readonly DsPalette['numbers'][number][], value: number) => tokens.find((t) => Math.abs(t.value - value) < 1e-6)

export interface DsReport { findings: AgentFinding[]; checked: number }

export function designSystemFindings(inv: Inventory, ctx: RuleContext, palette: DsPalette | null): DsReport {
  const out: AgentFinding[] = []
  let checked = 0

  for (const n of inv.nodes) {
    if (n.inInstance) continue
    if (ruleOn(ctx, 'detached') && n.detachedFrom) {
      out.push(finding('design-system', ctx, {
        rule: 'detached', severity: 'serious',
        title: `${n.name} is a detached instance of ${n.detachedFrom}`,
        meta: `Detached instances · ${n.path}`,
        nodeId: n.id,
        fix: { kind: 'manual', note: 'Swap it back for the library component and re-apply the overrides' },
        fixLabel: 'Fix: swap back to the component', fixable: false,
      }))
    }
    if (ruleOn(ctx, 'raw-colour')) {
      for (const f of n.fills) {
        checked += 1
        if (f.variableId) continue
        if (n.hasImageFill || n.type === 'TEXT') continue
        const near = palette ? nearestColor(f.rgb, palette.colors.filter((c) => !c.scopes.length || c.scopes.includes('ALL_SCOPES') || c.scopes.includes('FRAME_FILL') || c.scopes.includes('SHAPE_FILL') || c.scopes.includes('ALL_FILLS'))) : null
        out.push(finding('design-system', ctx, {
          rule: 'raw-colour', severity: near && near.distance < 1 ? 'moderate' : 'minor',
          title: near && near.distance < 1 ? `Fill ${f.hex.toUpperCase()} is ${near.name} typed by hand` : `Fill ${f.hex.toUpperCase()} has no variable`,
          meta: `Raw colours · ${n.path}`,
          nodeId: n.id,
          fix: near ? { kind: 'rebind-fill', variableId: near.id, variableName: near.name } : { kind: 'manual', note: 'Bind the fill to a Brand UI colour' },
          fixLabel: near ? `Fix: bind to ${near.name}${near.distance >= 1 ? ' (nearest)' : ''}` : null,
          fixable: Boolean(near) && near!.distance < 1,
        }))
      }
      if (n.stroke && !n.stroke.variableId) {
        checked += 1
        const near = palette ? nearestColor(n.stroke.rgb, palette.colors) : null
        out.push(finding('design-system', ctx, {
          rule: 'raw-colour', severity: 'minor',
          title: `Stroke ${n.stroke.hex.toUpperCase()} has no variable`,
          meta: `Raw colours · ${n.path}`,
          nodeId: n.id,
          fix: near ? { kind: 'rebind-stroke', variableId: near.id, variableName: near.name } : { kind: 'manual', note: 'Bind the stroke to a Brand UI colour' },
          fixLabel: near ? `Fix: bind to ${near.name}${near.distance >= 1 ? ' (nearest)' : ''}` : null,
          fixable: Boolean(near) && near!.distance < 1,
        }))
      }
    }
    if (ruleOn(ctx, 'off-scale') && n.layout) {
      for (const [field, value] of Object.entries(n.layout) as [keyof NonNullable<typeof n.layout>, typeof n.layout.itemSpacing][]) {
        checked += 1
        if (value.variableId || value.value === 0) continue
        const match = palette ? exact(spacingTokens(palette), value.value) : undefined
        if (onGrid(value.value) && !match) continue
        const label = field === 'itemSpacing' ? 'gap' : field.replace('padding', 'padding ').toLowerCase()
        out.push(finding('design-system', ctx, {
          rule: 'off-scale', severity: onGrid(value.value) ? 'minor' : 'moderate',
          title: match ? `${n.name} ${label} ${value.value} is ${match.name} typed by hand` : `${n.name} ${label} ${value.value} is off the ${GRID}px scale`,
          meta: `Off-scale spacing · ${n.path}`,
          nodeId: n.id,
          fix: match ? { kind: 'bind-number', field, variableId: match.id, variableName: match.name } : { kind: 'manual', note: `Use a spacing token (nearest grid value: ${Math.round(value.value / GRID) * GRID})` },
          fixLabel: match ? `Fix: bind to ${match.name}` : `Fix: use ${Math.round(value.value / GRID) * GRID} from the spacing scale`,
          fixable: Boolean(match),
        }))
      }
    }
    if (ruleOn(ctx, 'raw-radius') && n.cornerRadius && n.cornerRadius.value > 0 && !n.cornerRadius.variableId) {
      checked += 1
      const match = palette ? exact(radiusTokens(palette), n.cornerRadius.value) : undefined
      if (match || !onGrid(n.cornerRadius.value)) {
        out.push(finding('design-system', ctx, {
          rule: 'raw-radius', severity: 'minor',
          title: match ? `${n.name} radius ${n.cornerRadius.value} is ${match.name} typed by hand` : `${n.name} radius ${n.cornerRadius.value} is not a radius token`,
          meta: `Raw radii · ${n.path}`,
          nodeId: n.id,
          fix: match ? { kind: 'bind-number', field: 'cornerRadius', variableId: match.id, variableName: match.name } : { kind: 'manual', note: 'Bind the radius to a Brand UI radius token' },
          fixLabel: match ? `Fix: bind to ${match.name}` : null,
          fixable: Boolean(match),
        }))
      }
    }
  }

  if (ruleOn(ctx, 'unstyled-text')) {
    for (const t of inv.texts) {
      if (t.inInstance) continue
      checked += 1
      if (t.styled) continue
      out.push(finding('design-system', ctx, {
        rule: 'unstyled-text', severity: 'minor',
        title: `“${truncate(t.characters, 32)}” uses no text style (${t.fontFamily || 'font'} ${t.fontSize})`,
        meta: `Unstyled text · ${t.path}`,
        nodeId: t.id,
        fix: { kind: 'manual', note: 'Apply a text style from the library' },
        fixLabel: 'Fix: apply a text style', fixable: false,
      }))
    }
  }

  return { findings: groupFindings(out), checked: Math.max(checked, 1) }
}

export const dsSummary = (r: DsReport): string => `${plural(r.findings.length, 'raw value')} · ${r.findings.filter((f) => f.fixable).length} rebindable`
