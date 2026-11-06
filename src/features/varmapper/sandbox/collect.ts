// Reads one layer's hard-coded values: anything that could hold a variable or
// style and doesn't. Mixed values, images and gradients have nothing to bind.
import type { BindField, Category, Finding, LayerRef, ValueScope } from '../messages'

const CORNERS = ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'] as const
const PADDINGS = ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom'] as const
const STROKE_SIDES = ['strokeTopWeight', 'strokeBottomWeight', 'strokeLeftWeight', 'strokeRightWeight'] as const
/** Figma scopes frame and shape fills separately, and a library often uses both. */
const FRAME_TYPES: ReadonlySet<string> = new Set(['FRAME', 'COMPONENT', 'COMPONENT_SET', 'SECTION', 'INSTANCE'])
const PATH_DEPTH = 2

type Bag = Record<string, unknown>

const channel = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0')
export const toHex = (c: RGB) => `#${channel(c.r)}${channel(c.g)}${channel(c.b)}`.toUpperCase()

/** "Page header › Contents": the nearest ancestors, outermost first. */
export function pathOf(node: SceneNode): string {
  const names: string[] = []
  for (let p = node.parent; p && p.type !== 'PAGE' && names.length < PATH_DEPTH; p = p.parent) names.unshift(p.name)
  return names.join(' › ')
}

const hasVariable = (paint: Paint) => !!(paint as SolidPaint).boundVariables?.color

export function findingsOf(node: SceneNode): Finding[] {
  const n = node as unknown as Bag
  const bound = (n.boundVariables ?? {}) as Bag
  const layer: LayerRef = { id: node.id, name: node.name, path: pathOf(node) }
  const out: Finding[] = []
  const add = (category: Category, property: string, value: number | string, scope: ValueScope, field: BindField, extra: { opacity?: number; paintIndex?: number } = {}) => {
    const { paintIndex, ...rest } = extra
    out.push({ category, property, value, scope, layer, ...rest, target: { nodeId: node.id, field, ...(paintIndex !== undefined ? { paintIndex } : {}) } })
  }
  const isText = node.type === 'TEXT'

  const paints = (field: 'fills' | 'strokes', styled: unknown, property: string, scope: ValueScope) => {
    const list = n[field]
    if (!Array.isArray(list) || styled !== '') return
    ;(list as Paint[]).forEach((paint, paintIndex) => {
      if (paint.type !== 'SOLID' || paint.visible === false || hasVariable(paint)) return
      const opacity = paint.opacity ?? 1
      add('colors', property, toHex(paint.color), scope, field, { paintIndex, ...(opacity < 1 ? { opacity } : {}) })
    })
  }
  paints('fills', n.fillStyleId ?? '', isText ? 'Text fill' : 'Fill', isText ? 'TEXT_FILL' : FRAME_TYPES.has(node.type) ? 'FRAME_FILL' : 'SHAPE_FILL')
  paints('strokes', n.strokeStyleId ?? '', 'Stroke', 'STROKE_COLOR')

  if ('topLeftRadius' in n) {
    // With any corner bound, binding "all four" would overwrite it, so each free corner stands alone.
    if (typeof n.cornerRadius === 'number' && !CORNERS.some((c) => bound[c])) {
      if (n.cornerRadius > 0) add('border', 'Corner radius', n.cornerRadius, 'CORNER_RADIUS', 'cornerRadius')
    } else {
      for (const corner of CORNERS) {
        const v = n[corner]
        if (typeof v === 'number' && v > 0 && !bound[corner]) add('border', 'Corner radius', v, 'CORNER_RADIUS', corner)
      }
    }
  }

  const stroked = Array.isArray(n.strokes) && (n.strokes as Paint[]).some((s) => s.visible !== false)
  if (stroked && typeof n.strokeWeight === 'number' && !STROKE_SIDES.some((s) => bound[s])) {
    if (n.strokeWeight > 0 && !bound.strokeWeight) add('border', 'Stroke width', n.strokeWeight, 'STROKE_FLOAT', 'strokeWeight')
  } else if (stroked) {
    for (const side of STROKE_SIDES) {
      const v = n[side]
      if (typeof v === 'number' && v > 0 && !bound[side]) add('border', 'Stroke width', v, 'STROKE_FLOAT', side)
    }
  }

  if (n.layoutMode === 'HORIZONTAL' || n.layoutMode === 'VERTICAL') {
    if (typeof n.itemSpacing === 'number' && n.itemSpacing > 0 && !bound.itemSpacing && n.primaryAxisAlignItems !== 'SPACE_BETWEEN') {
      add('spacing', 'Gap', n.itemSpacing, 'GAP', 'itemSpacing')
    }
    if (n.layoutWrap === 'WRAP' && typeof n.counterAxisSpacing === 'number' && n.counterAxisSpacing > 0 && !bound.counterAxisSpacing) {
      add('spacing', 'Row gap', n.counterAxisSpacing, 'GAP', 'counterAxisSpacing')
    }
    for (const side of PADDINGS) {
      const v = n[side]
      if (typeof v === 'number' && v > 0 && !bound[side]) add('spacing', 'Padding', v, 'GAP', side)
    }
  }

  // A text style already owns these; mixed text has no single value.
  if (isText && n.textStyleId === '') {
    if (typeof n.fontSize === 'number' && !bound.fontSize) add('typography', 'Font size', n.fontSize, 'FONT_SIZE', 'fontSize')
    if (typeof n.fontWeight === 'number' && !bound.fontWeight) add('typography', 'Font weight', n.fontWeight, 'FONT_WEIGHT', 'fontWeight')
    const line = n.lineHeight as LineHeight | symbol
    if (typeof line === 'object' && line.unit === 'PIXELS' && !bound.lineHeight) add('typography', 'Line height', line.value, 'LINE_HEIGHT', 'lineHeight')
    const tracking = n.letterSpacing as LetterSpacing | symbol
    if (typeof tracking === 'object' && tracking.unit === 'PIXELS' && tracking.value !== 0 && !bound.letterSpacing) {
      add('typography', 'Letter spacing', tracking.value, 'LETTER_SPACING', 'letterSpacing')
    }
    if (typeof n.paragraphSpacing === 'number' && n.paragraphSpacing > 0 && !bound.paragraphSpacing) {
      add('typography', 'Paragraph spacing', n.paragraphSpacing, 'PARAGRAPH_SPACING', 'paragraphSpacing')
    }
  }
  return out
}
