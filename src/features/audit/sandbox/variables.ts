// The variable half of the audit: which paints read the system, which spacing is on
// its scale. Runs on the same walk as the component half (scan.ts).
import { rgbaToHex, type RGB } from '@shared/figma/color'
import type { LibraryVariable } from '@shared/libraries/types'
import { isOnScale, nearestOnScale, SPACING_LABELS, SPACING_PROPERTIES, type SpacingProperty } from '../drift'

/** Auto-layout property → the Figma field that holds it. */
const SPACING_FIELDS: Record<SpacingProperty, keyof AutoLayoutMixin> = {
  gap: 'itemSpacing',
  'padding-top': 'paddingTop',
  'padding-right': 'paddingRight',
  'padding-bottom': 'paddingBottom',
  'padding-left': 'paddingLeft',
}

export interface Scales {
  /** Every value the file or its library offers as spacing. */
  scale: Set<number>
  /** Variable name by lower-case hex. */
  colours: Map<string, string>
}

export interface ValueFinding { key: string; name: string; hint: string }

// Font sizes, radii and opacities are FLOATs too; letting them into the spacing scale
// would wave through a 10px gap because a 10px type size exists. Scopes decide when the
// file sets them; the path otherwise.
const spacingLike = (name: string, scopes: readonly string[]) =>
  scopes.some((sc) => sc === 'GAP' || sc === 'WIDTH_HEIGHT' || sc === 'ALL_SCOPES')
  || /(^|\/)(space|spacing|dimension|gap|padding|inset|inline|stack)/i.test(name)

/** Local variables plus the Dual File library's: a consumer file usually has none of its own. */
export async function loadScales(library: readonly LibraryVariable[]): Promise<Scales> {
  const scale = new Set<number>()
  const colours = new Map<string, string>()
  const addColour = (hex: string, name: string) => { if (!colours.has(hex)) colours.set(hex, name) }
  for (const collection of await figma.variables.getLocalVariableCollectionsAsync()) {
    for (const id of collection.variableIds) {
      const variable = await figma.variables.getVariableByIdAsync(id)
      if (!variable) continue
      const spacing = variable.resolvedType === 'FLOAT' && spacingLike(variable.name, variable.scopes)
      for (const value of Object.values(variable.valuesByMode)) {
        if (spacing && typeof value === 'number') scale.add(value)
        if (variable.resolvedType === 'COLOR' && value && typeof value === 'object' && 'r' in value) addColour(rgbaToHex(value as RGB), variable.name)
      }
    }
  }
  for (const v of library) {
    for (const { value } of v.values) {
      if (v.type === 'COLOR') addColour(value.toLowerCase(), v.name)
      else if (v.type === 'FLOAT' && spacingLike(v.name, v.scopes) && !Number.isNaN(Number(value))) scale.add(Number(value))
    }
  }
  return { scale, colours }
}

export interface PaintRead { bound: number; found: ValueFinding[] }

const hexOf = (paint: SolidPaint) => rgbaToHex({ ...paint.color, a: paint.opacity ?? 1 })

function readPaint(paint: Paint, bound: boolean, kind: 'fill' | 'stroke', colours: Scales['colours'], out: PaintRead): void {
  if (paint.type !== 'SOLID' || paint.visible === false) return
  if (bound) { out.bound += 1; return }
  const hex = hexOf(paint)
  const label = kind === 'fill' ? 'Fill' : 'Stroke'
  const suggestion = colours.get(hex)
  out.found.push({ key: `${kind}|${hex}`, name: hex.toUpperCase(), hint: suggestion ? `${label} · use ${suggestion}` : `${label} · no variable holds this` })
}

/** Text with several colours has no single `fills`: each styled run counts on its own. */
function readTextRuns(node: TextNode, colours: Scales['colours'], out: PaintRead): void {
  for (const run of node.getStyledTextSegments(['fills', 'fillStyleId', 'boundVariables'])) {
    const bindings = (run.boundVariables as Record<string, unknown> | undefined)?.fills
    run.fills.forEach((paint, index) => readPaint(paint, !!run.fillStyleId || (Array.isArray(bindings) && !!bindings[index]), 'fill', colours, out))
  }
}

function readPaints(node: SceneNode, kind: 'fill' | 'stroke', colours: Scales['colours'], out: PaintRead): void {
  const field = kind === 'fill' ? 'fills' : 'strokes'
  if (!(field in node)) return
  const paints = (node as SceneNode & Record<string, unknown>)[field]
  if (kind === 'fill' && node.type === 'TEXT' && paints === figma.mixed) { readTextRuns(node, colours, out); return }
  if (!Array.isArray(paints)) return
  const bindings = (node.boundVariables as Record<string, unknown> | undefined)?.[field]
  // A paint style is the older way of reading from the system; teams that have not
  // migrated to variables are not drifting.
  const styleId = (node as SceneNode & Record<string, unknown>)[kind === 'fill' ? 'fillStyleId' : 'strokeStyleId']
  const styled = typeof styleId === 'string' && styleId.length > 0
  paints.forEach((paint: Paint, index: number) => readPaint(paint, styled || (Array.isArray(bindings) && !!bindings[index]), kind, colours, out))
}

export function readNodePaints(node: SceneNode, colours: Scales['colours']): PaintRead {
  const out: PaintRead = { bound: 0, found: [] }
  readPaints(node, 'fill', colours, out)
  readPaints(node, 'stroke', colours, out)
  return out
}

/** Nothing to compare against without a scale, so nothing is reported: every value would be flagged. */
export function readNodeSpacing(node: SceneNode, scale: Scales['scale']): ValueFinding[] {
  if (!scale.size || !('layoutMode' in node) || node.layoutMode === 'NONE') return []
  const found: ValueFinding[] = []
  const bindings = node.boundVariables as Record<string, unknown> | undefined
  for (const property of SPACING_PROPERTIES) {
    const field = SPACING_FIELDS[property]
    // Already reads a variable, even one outside the scale we can see: that's the system, not drift.
    if (bindings?.[field]) continue
    const value = (node as unknown as Record<string, unknown>)[field]
    if (typeof value !== 'number' || isOnScale(value, scale)) continue
    found.push({ key: `${property}|${value}`, name: `${SPACING_LABELS[property]} ${value}`, hint: `Nearest on the scale: ${nearestOnScale(value, scale)}` })
  }
  return found
}
