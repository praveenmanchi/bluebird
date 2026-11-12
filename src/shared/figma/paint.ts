import { blendOver, type RGB, type RGBA } from './color'

/** What sits behind a node, and whether we can trust the answer. */
export interface BackgroundResolution {
  /** Composited backdrop. Meaningless when `indeterminate` is true. */
  color: RGB
  /** An image, gradient, video or mixed fill is in the stack: the ratio cannot be measured. */
  indeterminate: boolean
  /** Why it could not be measured, for the report. */
  reason?: string
  /** Variable bound to the winning opaque layer, when there is one. The fix
   *  suggests a token rather than a hex, so it needs to know what it is against. */
  variableId?: string
  /** True when nothing opaque was found and white was assumed — the finding
   *  should say so rather than present the ratio as measured. */
  assumed: boolean
  /** Product of the opacities of every ancestor walked before the opaque layer.
   *  A label inside a 40% group is 40% as strong as its own fill says. */
  foregroundOpacity: number
  /** Every backdrop the text sits on when that is a range rather than one colour (a gradient).
   *  The caller judges each and reports the worst; absent for an ordinary single-colour backdrop. */
  colors?: readonly RGB[]
}

/** A single paint layer read off a node. */
type Layer =
  | { kind: 'solid'; rgba: RGBA; variableId?: string }
  /** An opaque gradient: not one colour but a range, every point of which the text sits on. */
  | { kind: 'gradient'; stops: readonly RGB[] }
  | { kind: 'unmeasurable'; reason: string }
  | { kind: 'none' }

const UNMEASURABLE: Record<string, string> = {
  IMAGE: 'sits on an image fill',
  VIDEO: 'sits on a video fill',
  GRADIENT_LINEAR: 'sits on a gradient fill',
  GRADIENT_RADIAL: 'sits on a gradient fill',
  GRADIENT_ANGULAR: 'sits on a gradient fill',
  GRADIENT_DIAMOND: 'sits on a gradient fill',
}

/** First visible solid fill of a node as RGBA (Figma 0..1 floats), or null. */
export function solidFill(node: SceneNode): RGBA | null {
  const layer = topLayer(node)
  return layer.kind === 'solid' ? layer.rgba : null
}

/**
 * Topmost visible solid stroke, for WCAG 1.4.11. A gradient or image stroke
 * returns null rather than a guess — same contract as the fill side.
 */
export function solidStroke(node: SceneNode): RGBA | null {
  if (!('strokes' in node)) return null
  const strokes = node.strokes
  if (!Array.isArray(strokes) || !strokes.length) return null
  if ('strokeWeight' in node && node.strokeWeight === 0) return null
  const nodeOpacity = 'opacity' in node ? node.opacity : 1
  for (let i = strokes.length - 1; i >= 0; i -= 1) {
    const paint = strokes[i]!
    if (paint.visible === false) continue
    if ((paint.opacity ?? 1) === 0) continue
    if (paint.type !== 'SOLID') return null
    return { ...paint.color, a: (paint.opacity ?? 1) * nodeOpacity }
  }
  return null
}

/**
 * The topmost visible paint on a node. Unlike a "find the first SOLID" scan
 * this respects paint order: an image painted over a solid hides that solid,
 * so the answer is "unmeasurable", not the solid underneath.
 */
function topLayer(node: SceneNode): Layer {
  if (!('fills' in node)) return { kind: 'none' }
  const fills = node.fills
  if (fills === figma.mixed) return { kind: 'unmeasurable', reason: 'has mixed fills' }
  const nodeOpacity = 'opacity' in node ? node.opacity : 1
  return topLayerOf(fills, nodeOpacity, (i) => paintVariableId(node, i))
}

/**
 * The same paint-order rule over a bare paint array — what a styled text
 * segment gives us, where there is no node to read `fills` from.
 */
export function solidFromPaints(fills: readonly Paint[], opacity = 1): RGBA | null {
  const layer = topLayerOf(fills, opacity, () => undefined)
  return layer.kind === 'solid' ? layer.rgba : null
}

function topLayerOf(fills: readonly Paint[], nodeOpacity: number, variableAt: (index: number) => string | undefined): Layer {
  for (let i = fills.length - 1; i >= 0; i -= 1) {
    const paint = fills[i]!
    if (paint.visible === false) continue
    if ((paint.opacity ?? 1) === 0) continue
    if (paint.type === 'SOLID') {
      return {
        kind: 'solid',
        rgba: { ...paint.color, a: (paint.opacity ?? 1) * nodeOpacity },
        variableId: variableAt(i),
      }
    }
    const gradient = opaqueGradient(paint, (paint.opacity ?? 1) * nodeOpacity)
    if (gradient) return gradient
    const reason = UNMEASURABLE[paint.type]
    if (reason) return { kind: 'unmeasurable', reason }
  }
  return { kind: 'none' }
}

const GRADIENTS = new Set(['GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'GRADIENT_ANGULAR', 'GRADIENT_DIAMOND'])

/**
 * A gradient's distinct stop colours, when every one of them is opaque.
 *
 * Which stop a glyph sits on depends on geometry we do not read, so the honest
 * answer is the whole range: the caller measures against all of them and
 * reports the worst. A gradient with any transparency in it stays unmeasurable
 * — what shows through then depends on the stack below as well.
 */
function opaqueGradient(paint: Paint, opacity: number): Layer | null {
  if (!GRADIENTS.has(paint.type)) return null
  const stops = (paint as GradientPaint).gradientStops
  if (opacity < 1 || !stops || stops.length === 0) return null
  if (stops.some((s) => s.color.a < 1)) return null
  const seen = new Map<string, RGB>()
  for (const s of stops) seen.set(`${s.color.r}|${s.color.g}|${s.color.b}`, { r: s.color.r, g: s.color.g, b: s.color.b })
  return { kind: 'gradient', stops: [...seen.values()] }
}

/**
 * Node types that fill their whole bounding box, so overlapping one really does
 * put its colour behind you. Text is deliberately excluded: glyphs cover a
 * fraction of their box, and treating a neighbouring label as a backdrop is how
 * a scanner invents ratios. Vectors, stars and ellipses are not here either —
 * arbitrary shapes, rectangular bounds — and are judged apart (SHAPE_TYPES).
 */
const SOLID_AREA_TYPES = new Set(['FRAME', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE', 'RECTANGLE', 'SECTION'])

function paintsSolidArea(node: SceneNode): boolean {
  return SOLID_AREA_TYPES.has(node.type)
}

/** The variable bound to one paint slot, when the designer bound one. */
function paintVariableId(node: SceneNode, index: number): string | undefined {
  if (!('boundVariables' in node)) return undefined
  const fills = node.boundVariables?.fills
  return Array.isArray(fills) ? fills[index]?.id : undefined
}

/** Absolute rectangles, when Figma gives them to us. */
function bounds(node: SceneNode): { x: number; y: number; width: number; height: number } | null {
  return 'absoluteBoundingBox' in node ? node.absoluteBoundingBox : null
}

/**
 * How much of `node` does `sibling` cover, 0..1. A backdrop is something the
 * text actually sits on: a card whose corner grazes the label's bounding box
 * is not it. Nodes without bounds (unit-test fixtures, and anything Figma
 * declines to measure) count as full coverage, which keeps the old
 * ancestor-only behaviour rather than silently skipping.
 */
function coverage(sibling: SceneNode, node: SceneNode): number {
  const a = bounds(sibling)
  const b = bounds(node)
  if (!a || !b) return 1
  if (b.width <= 0 || b.height <= 0) return 0
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
  if (w <= 0 || h <= 0) return 0
  return (w * h) / (b.width * b.height)
}

/** A sibling has to sit under most of the text before it counts as its backdrop. */
const BACKDROP_MIN_COVERAGE = 0.8

/** Containers that paint nothing themselves but hold things that do. */
const TRANSPARENT_CONTAINERS = new Set(['GROUP', 'BOOLEAN_OPERATION'])

/**
 * The solid-area nodes inside a preceding sibling that could sit under `node`,
 * topmost first. A group is just a folder: the rectangle inside it is what
 * paints, so a group sibling is opened up rather than skipped.
 */
function backdropCandidates(sibling: SceneNode, node: SceneNode, out: Layer[] = []): Layer[] {
  if (sibling.visible === false) return out
  if (TRANSPARENT_CONTAINERS.has(sibling.type) && 'children' in sibling) {
    for (let i = sibling.children.length - 1; i >= 0; i -= 1) backdropCandidates(sibling.children[i]!, node, out)
    return out
  }
  if (coverage(sibling, node) < BACKDROP_MIN_COVERAGE) return out
  if (paintsSolidArea(sibling)) { out.push(topLayer(sibling)); return out }
  if (!SHAPE_TYPES.has(sibling.type)) return out
  // A painted shape under most of the layer is its backdrop too: initials on an
  // avatar circle, a count on a badge. Skipping it measures the text against
  // whatever lies further back, which is a ratio nobody sees.
  const layer = topLayer(sibling)
  if (layer.kind === 'none') return out
  // A full ellipse has known geometry; any other outline may or may not reach
  // behind the glyphs, so it is listed as unmeasurable rather than guessed.
  out.push(isWholeEllipse(sibling) && ellipseContains(sibling, node) ? layer : { kind: 'unmeasurable', reason: 'sits on a vector shape' })
  return out
}

/** Shapes whose painted area is not their bounding box. */
const SHAPE_TYPES = new Set(['ELLIPSE', 'VECTOR', 'STAR', 'POLYGON'])

const FULL_TURN = Math.PI * 2

/** An ellipse that is neither a ring nor a pie slice. */
function isWholeEllipse(node: SceneNode): boolean {
  if (node.type !== 'ELLIPSE') return false
  const arc = node.arcData
  if (!arc) return true
  return arc.innerRadius === 0 && Math.abs(Math.abs(arc.endingAngle - arc.startingAngle) - FULL_TURN) < 0.001
}

/** True when every corner of `node` lies inside the ellipse (unknown bounds count as inside, as `coverage` does). */
function ellipseContains(ellipse: SceneNode, node: SceneNode): boolean {
  const e = bounds(ellipse)
  const b = bounds(node)
  if (!e || !b) return true
  const rx = e.width / 2
  const ry = e.height / 2
  if (rx <= 0 || ry <= 0) return false
  const cx = e.x + rx
  const cy = e.y + ry
  return [b.x, b.x + b.width].every((x) => [b.y, b.y + b.height].every((y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1))
}

/**
 * Composite everything painted behind `node` until an opaque layer is reached.
 *
 * Figma paints children in array order, so a node's backdrop is built from the
 * siblings *before* it that overlap it, then its parent's own fill, then that
 * parent's preceding siblings, and so on. Walking only the parent chain — as
 * this used to — resolves text on a sibling card against the page and reports
 * a ratio that was never on screen.
 *
 * Falls back to white when nothing opaque is found: Figma's canvas grey is not
 * what ships, and white is the assumption that under-reports rather than over.
 */
export function resolveBackground(node: SceneNode): BackgroundResolution {
  const layers: RGBA[] = []
  let child: SceneNode = node
  let parent: BaseNode | null = node.parent
  let variableId: string | undefined
  let foregroundOpacity = 1
  let gradient: readonly RGB[] | undefined

  const push = (layer: Layer): 'continue' | 'done' | BackgroundResolution => {
    if (layer.kind === 'none') return 'continue'
    if (layer.kind === 'unmeasurable') {
      return { color: { r: 1, g: 1, b: 1 }, indeterminate: true, reason: layer.reason, assumed: false, foregroundOpacity }
    }
    // An opaque gradient ends the walk exactly as an opaque fill does.
    if (layer.kind === 'gradient') { gradient = layer.stops; return 'done' }
    layers.push(layer.rgba)
    // The opaque layer is the one a fix would have to work against, so that is
    // the binding worth reporting.
    if (layer.rgba.a >= 1) { variableId = layer.variableId; return 'done' }
    return 'continue'
  }

  while (parent && parent.type !== 'PAGE' && parent.type !== 'DOCUMENT') {
    const siblings = 'children' in parent ? parent.children : []
    const index = siblings.indexOf(child as never)
    for (let i = index - 1; i >= 0; i -= 1) {
      for (const layer of backdropCandidates(siblings[i]!, node)) {
        const result = push(layer)
        if (result === 'done') return composite(layers, variableId, foregroundOpacity, gradient)
        if (typeof result === 'object') return result
      }
    }

    const result = push(topLayer(parent as SceneNode))
    if (result === 'done') return composite(layers, variableId, foregroundOpacity, gradient)
    if (typeof result === 'object') return result

    // Everything inside this parent — the text included — is dimmed by it.
    if ('opacity' in parent && typeof parent.opacity === 'number') foregroundOpacity *= parent.opacity
    child = parent as SceneNode
    parent = parent.parent
  }

  return { ...composite(layers, variableId, foregroundOpacity), assumed: true }
}

function composite(
  layers: readonly RGBA[],
  variableId: string | undefined,
  foregroundOpacity: number,
  bases?: readonly RGB[],
): BackgroundResolution {
  const over = (base: RGB): RGB => {
    let bg = base
    for (let i = layers.length - 1; i >= 0; i -= 1) bg = blendOver(layers[i]!, bg)
    return bg
  }
  const colors = (bases ?? [{ r: 1, g: 1, b: 1 }]).map(over)
  return { color: colors[0]!, colors: bases ? colors : undefined, indeterminate: false, variableId, assumed: false, foregroundOpacity }
}

/** Backwards-compatible shorthand: the composited colour, ignoring measurability. */
export function effectiveBackground(node: SceneNode): RGB {
  return resolveBackground(node).color
}
