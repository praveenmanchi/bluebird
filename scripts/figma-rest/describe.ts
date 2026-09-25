// REST node → snapshot entry. Mirrors extract.ts describeNode / walk / extractSet exactly, so the
// REST and relay backends write the same components.json (checked by `npm run figma:parity`).
import { pruneToOverrides } from '../../src/shared/brand/extract'
import type { ComponentNode, ComponentSetSnapshot } from '../../src/shared/brand/snapshot'
import { parseVariantName } from '../../src/shared/brand/snapshot'
import { mixedStrokeWeight, mixedText, paintHex, pluginBindings, restFontStyle, splitPropName, styleKind, unrotatedSize } from './normalize'
import type { RestAlias, RestComponentMeta, RestNode, RestNodesResponse, RestStyleMeta } from './types'

export interface DescribeContext {
  /** Variable id → name. Unknown ids come back as `lib:<id>`, as extract.ts does for remote variables. */
  nameOf: (bound: RestAlias | RestAlias[] | undefined) => string | undefined
  components: Map<string, RestComponentMeta>
  componentSets: Map<string, RestComponentMeta>
  styles: Map<string, RestStyleMeta>
}

/** Fold the per-node component and style tables of a /nodes response into one lookup. */
export function tablesOf(res: RestNodesResponse): Pick<DescribeContext, 'components' | 'componentSets' | 'styles'> {
  const components = new Map<string, RestComponentMeta>()
  const componentSets = new Map<string, RestComponentMeta>()
  const styles = new Map<string, RestStyleMeta>()
  for (const entry of Object.values(res.nodes)) {
    for (const [id, m] of Object.entries(entry?.components ?? {})) components.set(id, m)
    for (const [id, m] of Object.entries(entry?.componentSets ?? {})) componentSets.set(id, m)
    for (const [id, m] of Object.entries(entry?.styles ?? {})) styles.set(id, m)
  }
  return { components, componentSets, styles }
}

function describeNode(ctx: DescribeContext, node: RestNode, p: string): ComponentNode {
  const { nameOf } = ctx
  const bv = pluginBindings(node.boundVariables)
  const b: Record<string, string> = {}
  const r: Record<string, unknown> = {}
  const fill = node.fills?.find((f) => f.visible !== false)
  if (fill) { const n = nameOf(fill.boundVariables?.color); if (n) b.fill = n; else { const hex = paintHex(fill); if (hex) r.fill = hex } }
  const stroke = node.strokes?.find((x) => x.visible !== false)
  if (stroke) {
    const n = nameOf(stroke.boundVariables?.color); if (n) b.stroke = n; else { const hex = paintHex(stroke); if (hex) r.stroke = hex }
    const w = nameOf(bv.strokeWeight); if (w) b.strokeWeight = w; else if (typeof node.strokeWeight === 'number' && !mixedStrokeWeight(node)) r.strokeWeight = node.strokeWeight
  }
  if (node.cornerRadius !== 0 && (node.cornerRadius !== undefined || node.rectangleCornerRadii)) {
    const n = nameOf(bv.topLeftRadius)
    if (n) b.radius = n
    else if (typeof node.cornerRadius === 'number') r.radius = node.cornerRadius
    else if (node.rectangleCornerRadii) { const [tl, tr, br, bl] = node.rectangleCornerRadii; r.radius = [tl, tr, br, bl] }
  }
  if (node.layoutMode && node.layoutMode !== 'NONE') {
    // REST omits an alignment left at Figma's default; the Plugin API always reports it as MIN.
    r.layout = [node.layoutMode, node.primaryAxisAlignItems ?? 'MIN', node.counterAxisAlignItems ?? 'MIN', node.layoutSizingHorizontal, node.layoutSizingVertical].join(' ')
    for (const k of ['itemSpacing', 'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom'] as const) { const n = nameOf(bv[k]); if (n) b[k] = n; else if (node[k]) r[k] = node[k] }
  }
  for (const k of ['width', 'height'] as const) { const n = nameOf(bv[k]); if (n) b[k] = n }
  // extract.ts rounds to one decimal; matching it exactly keeps the two snapshots comparable.
  if (node.type !== 'TEXT' && node.absoluteBoundingBox) r.size = unrotatedSize(node).map((n) => Math.round(n * 10) / 10)
  if (node.type === 'TEXT') describeText(ctx, node, bv, b, r)
  if (node.opacity !== undefined && node.opacity !== 1) r.opacity = Math.round(node.opacity * 100) / 100
  if (node.visible === false) r.hidden = true

  const entry: ComponentNode = { id: node.id, p, t: node.type, b }
  if (Object.keys(r).length) entry.r = r
  const st = styleRefs(ctx, node)
  if (st) entry.st = st
  if (node.type === 'INSTANCE') {
    // extract.ts records the main component's NAME ("Rating=A <Rating>") plus its id.
    entry.i = componentName(ctx, node.componentId)
    if (node.componentId) entry.mc = node.componentId
    const cp: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(node.componentProperties ?? {})) cp[splitPropName(k)] = v.value
    if (Object.keys(cp).length) entry.cp = cp
  }
  const refs = node.componentPropertyReferences
  if (refs && Object.keys(refs).length) entry.pr = Object.fromEntries(Object.entries(refs).map(([k, v]) => [k, splitPropName(v ?? '')]))
  return entry
}

function describeText(ctx: DescribeContext, node: RestNode, bv: ReturnType<typeof pluginBindings>, b: Record<string, string>, r: Record<string, unknown>) {
  r.text = node.characters
  for (const k of ['fontSize', 'fontFamily', 'fontWeight', 'lineHeight'] as const) { const n = ctx.nameOf(bv[k]); if (n) b[k] = n }
  const style = node.style
  if (!style) return
  if (!bv.fontSize && typeof style.fontSize === 'number' && !mixedText(node, ['fontSize'])) r.fontSize = style.fontSize
  if (!bv.fontFamily && style.fontFamily && !mixedText(node, ['fontFamily', 'fontStyle', 'fontWeight'])) {
    r.font = style.fontFamily
    const s = restFontStyle(style); if (s) r.style = s
  }
  if (!bv.lineHeight && !mixedText(node, ['lineHeightPx', 'lineHeightPercentFontSize', 'lineHeightUnit'])) {
    if (style.lineHeightUnit === 'PIXELS' && typeof style.lineHeightPx === 'number') r.lineHeightPx = style.lineHeightPx
    else if (typeof style.lineHeightPercentFontSize === 'number') r.lineHeightPercent = style.lineHeightPercentFontSize
  }
}

function styleRefs(ctx: DescribeContext, node: RestNode): Record<string, string> | undefined {
  const out: Record<string, string> = {}
  for (const [k, id] of Object.entries(node.styles ?? {})) {
    const kind = styleKind(k)
    const name = ctx.styles.get(id)?.name
    if (kind && name) out[kind] = name
  }
  return Object.keys(out).length ? out : undefined
}

function componentName(ctx: DescribeContext, id: string | undefined): string {
  const meta = id ? ctx.components.get(id) : undefined
  if (!meta) return 'unknown'
  const setName = meta.componentSetId ? ctx.componentSets.get(meta.componentSetId)?.name : undefined
  return `${meta.name}${setName ? ` <${setName}>` : ''}`
}

/** Mirrors extract.ts `walk`: instances record only what they override on their descendants. */
export function walk(ctx: DescribeContext, node: RestNode, path: string, out: ComponentNode[]): void {
  const p = path ? `${path}/${node.name}` : node.name
  out.push(describeNode(ctx, node, p))
  if (!node.children) return
  if (node.type !== 'INSTANCE') { for (const c of node.children) walk(ctx, c, p, out); return }
  const overrides = new Map<string, readonly string[]>()
  for (const ov of node.overrides ?? []) if (ov.id !== node.id) overrides.set(ov.id, ov.overriddenFields)
  if (!overrides.size) return
  const visit = (child: RestNode, childPath: string) => {
    const fields = overrides.get(child.id)
    if (fields?.length) out.push(pruneToOverrides(describeNode(ctx, child, childPath), fields))
    if (child.children) for (const grand of child.children) visit(grand, `${childPath}/${grand.name}`)
  }
  for (const c of node.children) visit(c, `${p}/${c.name}`)
}

/** Mirrors extract.ts `extractSet`. Screens (plain frames) are single-variant sets. */
export function describeSet(ctx: DescribeContext, code: string, doc: RestNode): ComponentSetSnapshot {
  const isSet = doc.type === 'COMPONENT_SET'
  const variantsSource = isSet ? (doc.children ?? []).filter((c) => c.type === 'COMPONENT') : [doc]
  const props: ComponentSetSnapshot['props'] = {}
  for (const [k, d] of Object.entries(doc.componentPropertyDefinitions ?? {})) props[splitPropName(k)] = { type: d.type, ...(d.variantOptions ? { options: d.variantOptions } : {}), default: d.defaultValue }
  const key = (isSet ? ctx.componentSets : ctx.components).get(doc.id)?.key
  return {
    code, id: doc.id, ...(key ? { key } : {}), name: doc.name, description: doc.description ?? '', props,
    variants: variantsSource.map((v) => {
      const nodes: ComponentNode[] = []
      walk(ctx, v, '', nodes)
      const vKey = ctx.components.get(v.id)?.key
      return { id: v.id, ...(vKey ? { key: vKey } : {}), name: v.name, props: isSet ? parseVariantName(v.name) : {}, nodes }
    }),
  }
}
