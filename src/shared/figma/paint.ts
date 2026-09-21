import { blendOver, type RGB, type RGBA } from './color'

/** First visible solid fill of a node as RGBA (Figma 0..1 floats), or null. */
export function solidFill(node: SceneNode): RGBA | null {
  if (!('fills' in node) || node.fills === figma.mixed) return null
  const paint = [...node.fills].reverse().find((p): p is SolidPaint => p.type === 'SOLID' && p.visible !== false)
  if (!paint) return null
  const opacity = (paint.opacity ?? 1) * ('opacity' in node ? node.opacity : 1)
  return { ...paint.color, a: opacity }
}

/**
 * Walk up the parent chain compositing translucent fills until an opaque
 * background is found. Falls back to white (Figma's default canvas is not
 * what users ship, but white is the safest assumption for text on nothing).
 */
export function effectiveBackground(node: SceneNode): RGB {
  const layers: RGBA[] = []
  let parent: BaseNode | null = node.parent
  while (parent && parent.type !== 'PAGE' && parent.type !== 'DOCUMENT') {
    const fill = solidFill(parent as SceneNode)
    if (fill) {
      layers.push(fill)
      if (fill.a >= 1) break
    }
    parent = parent.parent
  }
  let bg: RGB = { r: 1, g: 1, b: 1 }
  for (let i = layers.length - 1; i >= 0; i -= 1) bg = blendOver(layers[i]!, bg)
  return bg
}
