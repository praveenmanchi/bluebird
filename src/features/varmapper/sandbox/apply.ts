// Writes to the layers. Targets come from an earlier check, so nothing is written
// until the layer still holds the checked value, and Undo only touches layers
// that are still bound to the variable Bind used. After binding, holdsValue reads
// what the layer now renders: Figma swaps in the variable's value straight away, and
// a paint's opacity becomes the variable's alpha.
import type { Target } from '../messages'
import { toHex } from './collect'

const CORNERS = ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'] as const
const SIDES = ['strokeTopWeight', 'strokeBottomWeight', 'strokeLeftWeight', 'strokeRightWeight'] as const
const TEXT_FIELDS: ReadonlySet<string> = new Set(['fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'paragraphSpacing'])
const OPACITY_TOLERANCE = 0.01
const NUMBER_TOLERANCE = 0.01

type Bindable = SceneNode & { setBoundVariable: (field: string, variable: Variable | null) => void } & Record<string, unknown>

/** What a target held before Bind: the exact paint or field values, so Undo is lossless. */
export interface Snapshot {
  target: Target
  paint?: Paint
  fields?: readonly { field: string; value: unknown }[]
  /** Font weight is read-only on a text node, so the font is what puts it back. */
  fontName?: FontName
}

async function loadFonts(node: TextNode): Promise<void> {
  const fonts = node.characters.length ? node.getRangeAllFontNames(0, node.characters.length) : [node.fontName as FontName]
  await Promise.all(fonts.map((f) => figma.loadFontAsync(f)))
}

/** The node fields one target stands for. */
function fieldsOf(node: Bindable, field: Target['field']): readonly string[] {
  if (field === 'cornerRadius') return CORNERS
  if (field === 'strokeWeight' && 'strokeTopWeight' in node) return SIDES
  return [field]
}

const isPaintField = (field: Target['field']): field is 'fills' | 'strokes' => field === 'fills' || field === 'strokes'

function paintAt(node: Bindable, target: Target): SolidPaint | null {
  const list = node[target.field]
  if (!Array.isArray(list)) return null
  const paint = (list as Paint[])[target.paintIndex ?? 0]
  return paint?.type === 'SOLID' ? paint : null
}

function numberAt(node: Bindable, field: Target['field']): number | null {
  const v = node[field]
  if (typeof v === 'number') return v
  if (v && typeof v === 'object' && (v as { unit?: string }).unit === 'PIXELS') return (v as { value: number }).value
  return null
}

/** True when the layer renders this value, bound or not. */
export function holdsValue(node: SceneNode, target: Target, value: number | string, opacity = 1): boolean {
  const n = node as Bindable
  if (isPaintField(target.field)) {
    const paint = paintAt(n, target)
    return !!paint && toHex(paint.color) === value && Math.abs((paint.opacity ?? 1) - opacity) < OPACITY_TOLERANCE
  }
  if (TEXT_FIELDS.has(target.field) && node.type !== 'TEXT') return false
  const held = numberAt(n, target.field)
  return held !== null && Math.abs(held - (value as number)) < NUMBER_TOLERANCE
}

/** True when the layer still holds what the check saw, unbound. */
export function stillMatches(node: SceneNode, target: Target, value: number | string, opacity = 1): boolean {
  if (isPaintField(target.field) && paintAt(node as Bindable, target)?.boundVariables?.color) return false
  return holdsValue(node, target, value, opacity)
}

export async function bindTarget(node: SceneNode, target: Target, variable: Variable): Promise<Snapshot> {
  const n = node as Bindable
  if (TEXT_FIELDS.has(target.field)) await loadFonts(node as TextNode)
  if (isPaintField(target.field)) {
    const paints = [...(n[target.field] as Paint[])]
    const index = target.paintIndex ?? 0
    const paint = paints[index] as SolidPaint
    paints[index] = figma.variables.setBoundVariableForPaint(paint, 'color', variable)
    ;(n as Record<string, unknown>)[target.field] = paints
    return { target, paint }
  }
  const fields = fieldsOf(n, target.field).map((field) => ({ field, value: n[field] }))
  const fontName = target.field === 'fontWeight' ? { fontName: n.fontName as FontName } : {}
  let done = 0
  try {
    for (const { field } of fields) {
      n.setBoundVariable(field, variable)
      done += 1
    }
  } catch (e: unknown) {
    // All or nothing: a half-bound radius would have no snapshot for Undo to work from.
    for (const { field, value } of fields.slice(0, done)) {
      n.setBoundVariable(field, null)
      ;(n as Record<string, unknown>)[field] = value
    }
    throw e
  }
  return { target, fields, ...fontName }
}

function boundTo(node: Bindable, field: string, variableId: string): boolean {
  const bound = (node.boundVariables as Record<string, unknown> | undefined)?.[field]
  return [bound].flat().some((b) => (b as { id?: string } | undefined)?.id === variableId)
}

/** Puts the snapshot back. False, and nothing written, when the layer moved on from this binding. */
export async function restoreTarget(node: SceneNode, snapshot: Snapshot, variableId: string): Promise<boolean> {
  const n = node as Bindable
  const { target, paint, fields, fontName } = snapshot
  if (paint) {
    const current = paintAt(n, target)
    if (current?.boundVariables?.color?.id !== variableId) return false
    const paints = [...(n[target.field] as Paint[])]
    paints[target.paintIndex ?? 0] = paint
    ;(n as Record<string, unknown>)[target.field] = paints
    return true
  }
  if (!fields?.every(({ field }) => boundTo(n, field, variableId))) return false
  if (TEXT_FIELDS.has(target.field)) await loadFonts(node as TextNode)
  if (fontName) await figma.loadFontAsync(fontName)
  for (const { field, value } of fields) {
    n.setBoundVariable(field, null)
    if (fontName) (n as Record<string, unknown>).fontName = fontName
    else (n as Record<string, unknown>)[field] = value
  }
  return true
}
