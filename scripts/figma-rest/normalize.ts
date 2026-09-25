// REST describes a node differently from the Plugin API that extract.ts reads. These pure helpers
// translate REST into the Plugin API's shape, so both backends write identical snapshots.
import { rgbaToHex } from '../../src/shared/figma/color'
import type { RestAlias, RestNode, RestPaint, RestTextStyle } from './types'

/** Numeric weight → Figma style name, for text whose REST style has neither fontStyle nor a PostScript name. */
const WEIGHT_NAMES: Record<number, string> = { 100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' }

/** REST nests some bindings the Plugin API keeps flat: `size.{x,y}`, `rectangleCornerRadii.RECTANGLE_*`
 *  and `individualStrokeWeights.BORDER_*`. Flattening to the plugin keys lets describeNode read both
 *  backends the same way — extract.ts looks up `width`, `topLeftRadius` and `strokeWeight`. */
const NESTED_BINDINGS: Record<string, Record<string, string>> = {
  size: { x: 'width', y: 'height' },
  rectangleCornerRadii: { RECTANGLE_TOP_LEFT_CORNER_RADIUS: 'topLeftRadius', RECTANGLE_TOP_RIGHT_CORNER_RADIUS: 'topRightRadius', RECTANGLE_BOTTOM_RIGHT_CORNER_RADIUS: 'bottomRightRadius', RECTANGLE_BOTTOM_LEFT_CORNER_RADIUS: 'bottomLeftRadius' },
  individualStrokeWeights: { BORDER_TOP_WEIGHT: 'strokeTopWeight', BORDER_RIGHT_WEIGHT: 'strokeRightWeight', BORDER_BOTTOM_WEIGHT: 'strokeBottomWeight', BORDER_LEFT_WEIGHT: 'strokeLeftWeight' },
}

export function pluginBindings(raw: RestNode['boundVariables'] = {}): Record<string, RestAlias | RestAlias[]> {
  const out: Record<string, RestAlias | RestAlias[]> = {}
  for (const [key, value] of Object.entries(raw)) {
    const nested = NESTED_BINDINGS[key]
    if (!nested) { out[key] = value as RestAlias | RestAlias[]; continue }
    for (const [sub, alias] of Object.entries(value as Record<string, RestAlias>)) if (nested[sub]) out[nested[sub]] = alias
  }
  return out
}

// The Plugin API answers `figma.mixed` where REST answers the node's base value, and extract.ts
// records nothing for a mixed value. These make REST do the same.

/** Per-side stroke weights that differ (a top-only border) are a mixed `strokeWeight`. */
export function mixedStrokeWeight(node: RestNode): boolean {
  const w = node.individualStrokeWeights
  return !!w && new Set([w.top, w.right, w.bottom, w.left]).size > 1
}

/** A text run whose override sets one of these keys to something other than the base style. */
export function mixedText(node: RestNode, keys: (keyof RestTextStyle)[]): boolean {
  const used = new Set(node.characterStyleOverrides ?? [])
  return Object.entries(node.styleOverrideTable ?? {}).some(([id, o]) =>
    used.has(Number(id)) && keys.some((k) => o[k] !== undefined && o[k] !== node.style?.[k]))
}

/** Plugin `width`/`height` are pre-rotation; REST's bounding box is post-rotation. A LINE is its
 *  length × 0 at any angle; for other nodes quarter turns swap the axes. */
export function unrotatedSize(node: RestNode): [number, number] {
  const { width, height } = node.absoluteBoundingBox!
  if (node.type === 'LINE') return [Math.hypot(width, height), 0]
  const quarterTurn = Math.abs(Math.abs(Math.sin(node.rotation ?? 0)) - 1) < 1e-6
  return quarterTurn ? [height, width] : [width, height]
}

/** The Plugin API's `fontName.style` ("Semi Bold"). REST's `fontStyle` is the same string;
 *  `fontPostScriptName` is often null (Inter, Google fonts), so it is only a fallback. */
export function restFontStyle(style: RestTextStyle): string | undefined {
  return style.fontStyle ?? style.fontPostScriptName?.split('-')[1] ?? (typeof style.fontWeight === 'number' ? WEIGHT_NAMES[style.fontWeight] : undefined)
}

/** Mirrors extract.ts `paintHex`: solid colour + the paint's own opacity, via the same rgbaToHex. */
export function paintHex(paint: RestPaint | undefined): string | undefined {
  if (!paint || paint.type !== 'SOLID' || !paint.color) return undefined
  return rgbaToHex({ r: paint.color.r, g: paint.color.g, b: paint.color.b, a: paint.opacity ?? 1 })
}

export function restColorToHex(c: { r: number; g: number; b: number; a?: number }): string {
  const h = (n: number) => Math.round(Math.min(1, Math.max(0, n)) * 255).toString(16).padStart(2, '0')
  const a = c.a ?? 1
  return `#${h(c.r)}${h(c.g)}${h(c.b)}${a < 1 ? h(a) : ''}`
}

/** REST `styles` keys (fill, fills, text, stroke, strokes, effect) → the snapshot's `st` keys,
 *  which extract.ts derives from fillStyleId / textStyleId / strokeStyleId / effectStyleId. */
export function styleKind(restKey: string): string | undefined {
  const k = restKey.replace(/s$/, '')
  return ['fill', 'text', 'stroke', 'effect'].includes(k) ? k : undefined
}

/** Plugin API variant name for an override field REST spells differently. */
export const splitPropName = (k: string): string => k.split('#')[0] ?? k
