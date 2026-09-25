// Runs inside Figma. Everything that touches the document for this tab lives here.
import type { HandlerMap, HandlerContext } from '@shared/bridge'
import { brand } from '@shared/config'
import { traverse, scopeRoots } from '@shared/figma/traverse'
import { rgbaToHex, type RGB } from '@shared/figma/color'
import { isOnScale, nearestOnScale, SPACING_PROPERTIES, tokenCoverage, type SpacingProperty } from '../audit'
import {
  MSG, auditRequestSchema, focusRequestSchema, selectRequestSchema,
  type AuditResult, type AuditProgress, type UnboundPaint, type OffScaleSpacing,
} from '../messages'

/** Auto-layout property → the Figma field that holds it. */
const SPACING_FIELDS: Record<SpacingProperty, keyof AutoLayoutMixin> = {
  gap: 'itemSpacing',
  'padding-top': 'paddingTop',
  'padding-right': 'paddingRight',
  'padding-bottom': 'paddingBottom',
  'padding-left': 'paddingLeft',
}

async function audit(payload: unknown, ctx: HandlerContext): Promise<AuditResult> {
  const { scope } = auditRequestSchema.parse(payload)
  const started = Date.now()

  const { scale, colours } = await loadScales()

  const unbound = new Map<string, UnboundPaint & { nodeIds: string[] }>()
  const offScale = new Map<string, OffScaleSpacing & { nodeIds: string[] }>()
  let boundPaints = 0

  figma.skipInvisibleInstanceChildren = true
  const scanned = await traverse(
    scopeRoots(scope),
    (node) => {
      if (!node.visible) return
      collectPaints(node, 'fill', unbound, colours, () => { boundPaints += 1 })
      collectPaints(node, 'stroke', unbound, colours, () => { boundPaints += 1 })
      collectSpacing(node, scale, offScale)
    },
    { onProgress: (visited) => ctx.emit(MSG.progress, { visited } satisfies AuditProgress) },
  )

  return {
    scope,
    meta: { file: figma.root.name, page: figma.currentPage.name, brand: brand.label },
    scanned,
    boundPaints,
    unbound: [...unbound.values()].sort((a, b) => b.occurrences - a.occurrences),
    offScale: [...offScale.values()].sort((a, b) => b.occurrences - a.occurrences),
    coverage: tokenCoverage(boundPaints, [...unbound.values()].reduce((n, u) => n + u.occurrences, 0)),
    durationMs: Date.now() - started,
  }
}

/** Every FLOAT value the file offers as spacing, and every COLOR by hex. */
async function loadScales(): Promise<{ scale: Set<number>; colours: Map<string, { id: string; name: string }> }> {
  const scale = new Set<number>()
  const colours = new Map<string, { id: string; name: string }>()
  const collections = await figma.variables.getLocalVariableCollectionsAsync()
  for (const collection of collections) {
    for (const id of collection.variableIds) {
      const variable = await figma.variables.getVariableByIdAsync(id)
      if (!variable) continue
      // Font sizes, radii and opacities are FLOATs too; letting them into the
      // spacing scale would wave through a 10px gap because a 10px type size
      // exists. Scopes decide when the file sets them; the path otherwise.
      const spacingLike = variable.resolvedType === 'FLOAT' && (
        variable.scopes.some((sc) => sc === 'GAP' || sc === 'WIDTH_HEIGHT' || sc === 'ALL_SCOPES')
        || /(^|\/)(space|spacing|dimension|gap|padding|inset|inline|stack)/i.test(variable.name)
      )
      for (const value of Object.values(variable.valuesByMode)) {
        if (spacingLike && typeof value === 'number') scale.add(value)
        if (variable.resolvedType === 'COLOR' && value && typeof value === 'object' && 'r' in value) {
          const hex = rgbaToHex(value as RGB)
          if (!colours.has(hex)) colours.set(hex, { id, name: variable.name })
        }
      }
    }
  }
  return { scale, colours }
}

function collectPaints(
  node: SceneNode,
  kind: 'fill' | 'stroke',
  out: Map<string, UnboundPaint & { nodeIds: string[] }>,
  colours: ReadonlyMap<string, { id: string; name: string }>,
  onBound: () => void,
): void {
  const field = kind === 'fill' ? 'fills' : 'strokes'
  if (!(field in node)) return
  const paints = (node as SceneNode & Record<string, unknown>)[field]
  if (!Array.isArray(paints)) return
  const bindings = (node.boundVariables as Record<string, unknown> | undefined)?.[field]
  // A paint style is the older way of reading from the system; teams that
  // have not migrated to variables are not drifting.
  const styleId = (node as SceneNode & Record<string, unknown>)[kind === 'fill' ? 'fillStyleId' : 'strokeStyleId']
  const styled = typeof styleId === 'string' && styleId.length > 0

  paints.forEach((paint: Paint, index: number) => {
    if (paint.type !== 'SOLID' || paint.visible === false) return
    if (styled || (Array.isArray(bindings) && bindings[index])) { onBound(); return }

    const hex = rgbaToHex(paint.color)
    const key = `${kind}|${hex}`
    const existing = out.get(key)
    if (existing) {
      existing.nodeIds.push(node.id)
      existing.occurrences += 1
      return
    }
    out.set(key, {
      nodeId: node.id, nodeIds: [node.id], occurrences: 1, name: node.name,
      kind, hex, suggestion: colours.get(hex),
    })
  })
}

function collectSpacing(
  node: SceneNode,
  scale: ReadonlySet<number>,
  out: Map<string, OffScaleSpacing & { nodeIds: string[] }>,
): void {
  if (!('layoutMode' in node) || node.layoutMode === 'NONE') return
  // Padding inside an instance comes from its main component; the finding
  // belongs on the component, not repeated on every instance.
  if (insideInstance(node)) return
  for (const property of SPACING_PROPERTIES) {
    const value = (node as unknown as Record<string, unknown>)[SPACING_FIELDS[property]]
    if (typeof value !== 'number' || isOnScale(value, scale)) continue

    const key = `${property}|${value}`
    const existing = out.get(key)
    if (existing) {
      existing.nodeIds.push(node.id)
      existing.occurrences += 1
      continue
    }
    out.set(key, {
      nodeId: node.id, nodeIds: [node.id], occurrences: 1, name: node.name,
      property, value, nearest: nearestOnScale(value, scale),
    })
  }
}

function insideInstance(node: SceneNode): boolean {
  for (let p = node.parent; p && p.type !== 'PAGE'; p = p.parent) if (p.type === 'INSTANCE') return true
  return false
}

async function focus(payload: unknown): Promise<void> {
  const { nodeId } = focusRequestSchema.parse(payload)
  const node = await figma.getNodeByIdAsync(nodeId)
  if (!node || node.type === 'DOCUMENT' || node.type === 'PAGE') throw new Error('Layer no longer exists')
  figma.currentPage.selection = [node as SceneNode]
  figma.viewport.scrollAndZoomIntoView([node as SceneNode])
}

async function selectAll(payload: unknown): Promise<{ selected: number }> {
  const { nodeIds } = selectRequestSchema.parse(payload)
  const nodes: SceneNode[] = []
  for (const id of nodeIds) {
    const node = await figma.getNodeByIdAsync(id)
    if (node && node.type !== 'DOCUMENT' && node.type !== 'PAGE') nodes.push(node as SceneNode)
  }
  if (!nodes.length) throw new Error('None of those layers still exist')
  figma.currentPage.selection = nodes
  figma.viewport.scrollAndZoomIntoView(nodes)
  return { selected: nodes.length }
}

export const handlers: HandlerMap = {
  [MSG.audit]: audit,
  [MSG.focus]: focus,
  [MSG.selectAll]: selectAll,
}
