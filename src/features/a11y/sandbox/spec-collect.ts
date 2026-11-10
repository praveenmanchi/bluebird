// Reads one screen for the developer spec: its interactive layers, headings,
// landmarks and image fills. Runs inside Figma; every judgement (role, level,
// landmark) comes from the pure tables in doc/spec-roles.ts.
import { headingLevels, humanName, landmarkFor, looksLikeHeading, roleFor } from '../doc/spec-roles'
import type { CollectedControl, CollectedHeading, CollectedLandmark, Rect, SpecInput } from '../doc/spec-doc'

/** Enough for any real screen without stalling the sandbox. */
export const SPEC_NODE_LIMIT = 5000
const MAX_HEADINGS = 12
const MAX_LANDMARK_DEPTH = 2
const STATE_PROP = /^(state|status|interaction)$/i

/** The screen to spec: the selected frame, or the top-level frame holding the selection. */
export function specRoot(selection: readonly SceneNode[]): FrameNode | ComponentNode | InstanceNode | null {
  const first = selection[0]
  if (!first) return null
  let node: BaseNode = first
  while (node.parent && node.parent.type !== 'PAGE' && node.parent.type !== 'SECTION') node = node.parent
  return node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE' ? node : null
}

const hasReaction = (node: SceneNode): boolean => 'reactions' in node && Array.isArray(node.reactions) && node.reactions.length > 0
const hasImage = (node: SceneNode): boolean => 'fills' in node && Array.isArray(node.fills) && (node.fills as readonly Paint[]).some((p) => p.type === 'IMAGE' && p.visible !== false)

function relative(node: SceneNode, origin: Rect): Rect | null {
  const b = node.absoluteBoundingBox
  return b ? { x: b.x - origin.x, y: b.y - origin.y, width: b.width, height: b.height } : null
}

function visibleText(node: SceneNode): string {
  if (!('findAllWithCriteria' in node)) return node.type === 'TEXT' ? node.characters.trim() : ''
  const texts = (node as FrameNode).findAllWithCriteria({ types: ['TEXT'] }).filter((t) => t.visible)
  return texts.map((t) => t.characters.trim()).filter(Boolean).join(' ').slice(0, 60)
}

async function componentOf(node: SceneNode): Promise<{ name: string; states: string[] } | null> {
  if (node.type !== 'INSTANCE') return null
  const main = await node.getMainComponentAsync()
  if (!main) return null
  const set = main.parent?.type === 'COMPONENT_SET' ? main.parent : null
  if (!set) return { name: main.name, states: [] }
  const defs = set.componentPropertyDefinitions
  const stateKey = Object.keys(defs).find((k) => STATE_PROP.test(k))
  return { name: set.name, states: stateKey ? [...(defs[stateKey]?.variantOptions ?? [])] : [] }
}

export async function collectSpec(root: FrameNode | ComponentNode | InstanceNode): Promise<SpecInput> {
  const origin = root.absoluteBoundingBox ?? { x: root.x, y: root.y, width: root.width, height: root.height }
  const controls: CollectedControl[] = []
  const headingCandidates: { node: TextNode; box: Rect }[] = []
  const landmarks: CollectedLandmark[] = []
  let images = 0
  let visited = 0
  const stack: { node: SceneNode; depth: number }[] = ('children' in root ? [...root.children] : []).reverse().map((node) => ({ node, depth: 1 }))

  while (stack.length && visited < SPEC_NODE_LIMIT) {
    const { node, depth } = stack.pop()!
    visited += 1
    if (!node.visible) continue
    if (hasImage(node)) images += 1

    const component = await componentOf(node)
    // An instance is what its component is; layer names often describe content ("Card · Close").
    // Only a hand-drawn frame with an interaction is judged by its own name.
    const role = node.type === 'INSTANCE'
      ? roleFor([component?.name ?? ''], hasReaction(node))
      : hasReaction(node) ? roleFor([node.name], true) : null
    const box = relative(node, origin)
    if (role && box) {
      controls.push({ nodeId: node.id, name: node.name, component: component?.name, role, text: visibleText(node), states: component?.states ?? [], detached: node.type !== 'INSTANCE', box })
      continue // A control's insides are part of it, not controls of their own.
    }

    if (depth <= MAX_LANDMARK_DEPTH && box && node.type !== 'TEXT') {
      const landmark = landmarkFor(`${component?.name ?? ''} ${node.name}`)
      if (landmark && !landmarks.some((l) => l.role === landmark && landmark !== 'navigation')) {
        landmarks.push({ nodeId: node.id, name: humanName(node.name) ?? component?.name ?? landmark, role: landmark, box })
      }
    }

    if (node.type === 'TEXT' && box && typeof node.fontSize === 'number') {
      const style = typeof node.textStyleId === 'string' && node.textStyleId ? (await figma.getStyleByIdAsync(node.textStyleId))?.name : undefined
      if (looksLikeHeading(node.fontSize, style, node.characters)) headingCandidates.push({ node, box })
    }

    if ('children' in node) for (let i = node.children.length - 1; i >= 0; i -= 1) stack.push({ node: node.children[i]!, depth: depth + 1 })
  }

  const picked = headingCandidates.slice(0, MAX_HEADINGS)
  const levels = headingLevels(picked.map((h) => h.node.fontSize as number))
  const headings: CollectedHeading[] = picked.map((h, i) => ({ nodeId: h.node.id, text: h.node.characters.trim().slice(0, 60), level: levels[i] ?? 3, box: h.box }))

  return { rootId: root.id, rootName: root.name, rootSize: { width: root.width, height: root.height }, controls, headings, landmarks, images }
}
