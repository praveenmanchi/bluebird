// Runs INSIDE Figma (sandbox handler `figma:snapshot`, or pasted into the
// Figma MCP `use_figma` tool). Produces the JSON committed under figma/.
// Only the Plugin API is used; nothing here touches the DOM.
import type {
  ComponentNode as SnapNode, ComponentSetSnapshot, ComponentsSnapshot, CoverageRow,
  IconsSnapshot, ResolvedValue, SnapshotCollection, SnapshotVariable, TokenSnapshot, VariableType,
} from './snapshot'
import { parseVariantName, variableMeta } from './snapshot'
import { rgbaToHex } from '../figma/color'
import { inCoverage, placeComponents, resolveLayout, type PageLayout, type PageRef } from './componentPages'

export interface ExtractManifest {
  fileKey: string
  componentsPage: PageRef
  /** Tier pages (Atoms, Molecules, Organisms, Icons). Used when the file has them, else componentsPage. */
  componentPages?: PageRef[]
  collections: { primitives: string; semantics: string; brand: string }
  componentSets: { code: string; figma: string; id: string }[]
  iconSet: { id: string; name: string; variantProperty: string }
}

const MAX_ALIAS_DEPTH = 10

interface VariableIndex {
  byId: Map<string, Variable>
  collectionById: Map<string, VariableCollection>
}

async function indexVariables(): Promise<VariableIndex> {
  const collections = await figma.variables.getLocalVariableCollectionsAsync()
  const variables = await figma.variables.getLocalVariablesAsync()
  return {
    byId: new Map(variables.map((v) => [v.id, v])),
    collectionById: new Map(collections.map((c) => [c.id, c])),
  }
}

function isAlias(value: VariableValue | undefined): value is VariableAlias {
  return typeof value === 'object' && value !== null && 'type' in value && value.type === 'VARIABLE_ALIAS'
}

function rawValue(value: VariableValue): ResolvedValue {
  if (typeof value === 'object' && value !== null && 'r' in value) return rgbaToHex(value as RGBA)
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
  return null
}

/** Follows aliases across collections. Mode ids are per collection, so the hop into another
 *  collection picks that collection's mode with the SAME NAME (Brand "Ikea" → Semantics "Ikea")
 *  and falls back to its default mode when there is none (single-mode Foundations). */
function resolveValue(index: VariableIndex, value: VariableValue | undefined, mode: { modeId: string; name: string }, depth = 0): ResolvedValue {
  if (value === undefined || depth > MAX_ALIAS_DEPTH) return null
  if (isAlias(value)) {
    const target = index.byId.get(value.id)
    if (!target) return null
    const collection = index.collectionById.get(target.variableCollectionId)
    const modeId = collection?.modes.find((m) => m.name === mode.name)?.modeId ?? collection?.defaultModeId ?? mode.modeId
    const next = target.valuesByMode[modeId] ?? Object.values(target.valuesByMode)[0]
    return resolveValue(index, next, { modeId, name: mode.name }, depth + 1)
  }
  return rawValue(value)
}

function aliasName(index: VariableIndex, value: VariableAlias): string | null {
  const target = index.byId.get(value.id)
  if (!target) return null
  const collection = index.collectionById.get(target.variableCollectionId)
  return `${collection?.name ?? '?'}/${target.name}`
}

function snapshotCollection(index: VariableIndex, collection: VariableCollection, key: string): SnapshotCollection {
  const variables: SnapshotVariable[] = []
  for (const id of collection.variableIds) {
    const v = index.byId.get(id)
    if (!v) continue
    // The id is what lets a REST pull name this variable without Enterprise access to
    // /variables/local: ids are stable for the life of the file, so one relay pull seeds the map.
    const entry: SnapshotVariable = { id: v.id, name: v.name, type: v.resolvedType as VariableType, values: {}, ...variableMeta(v) }
    const aliases: Record<string, string> = {}
    for (const mode of collection.modes) {
      const value = v.valuesByMode[mode.modeId]
      entry.values[mode.name] = resolveValue(index, value, mode)
      if (isAlias(value)) { const a = aliasName(index, value); if (a) aliases[mode.name] = a }
    }
    if (Object.keys(aliases).length) entry.aliases = aliases
    variables.push(entry)
  }
  return {
    id: collection.id,
    ...(collection.key ? { publishKey: collection.key } : {}),
    name: collection.name,
    key,
    modes: collection.modes.map((m) => m.name),
    defaultMode: collection.modes.find((m) => m.modeId === collection.defaultModeId)?.name ?? collection.modes[0]?.name ?? '',
    variables,
  }
}

export async function extractTokens(manifest: ExtractManifest): Promise<TokenSnapshot> {
  const index = await indexVariables()
  const collections: SnapshotCollection[] = []
  for (const [key, name] of Object.entries(manifest.collections)) {
    const collection = [...index.collectionById.values()].find((c) => c.name === name)
    if (!collection) throw new Error(`Variable collection "${name}" not found`)
    collections.push(snapshotCollection(index, collection, key))
  }
  return { fileKey: manifest.fileKey, fileName: figma.root.name, pulledAt: today(), source: 'figma-plugin', collections }
}

// ---------------------------------------------------------------- components

type Bound = { id: string } | { id: string }[] | undefined

/** Every variable id bound anywhere under `root` (node properties and paint colours). */
function boundIds(root: SceneNode): Set<string> {
  const ids = new Set<string>()
  const add = (b: unknown) => { for (const x of Array.isArray(b) ? b : [b]) if (x && typeof x === 'object' && 'id' in x) ids.add(String((x as { id: string }).id)) }
  const nodes: SceneNode[] = [root, ...('findAll' in root ? root.findAll(() => true) : [])]
  for (const n of nodes) {
    for (const v of Object.values(n.boundVariables ?? {})) add(v)
    for (const key of ['fills', 'strokes'] as const) {
      const paints = key in n ? (n as unknown as Record<string, unknown>)[key] : undefined
      if (Array.isArray(paints)) for (const p of paints as Paint[]) if (p.type === 'SOLID') add(p.boundVariables?.color)
    }
  }
  return ids
}

/** Add the library variables `root` binds to the index, so they are named like REST's Enterprise
 *  tier names them (`/variables/local` includes subscribed library variables) instead of `lib:<id>`. */
async function indexLibraryVariables(index: VariableIndex, root: SceneNode): Promise<void> {
  for (const id of boundIds(root)) {
    if (index.byId.has(id)) continue
    const v = await figma.variables.getVariableByIdAsync(id)
    if (v) index.byId.set(id, v)
  }
}

function boundName(index: VariableIndex, bound: Bound): string | undefined {
  if (!bound) return undefined
  const first = Array.isArray(bound) ? bound[0] : bound
  if (!first) return undefined
  return index.byId.get(first.id)?.name ?? `lib:${first.id}`
}

function firstVisible<T extends { visible?: boolean }>(paints: readonly T[] | PluginAPI['mixed']): T | undefined {
  return Array.isArray(paints) ? paints.find((p) => p.visible !== false) : undefined
}

/** Figma `overriddenFields` names → the snapshot keys they affect (b + r).
 *  Shared with the REST pull (scripts/figma-pull.ts) so the two extractors describe an
 *  instance the same way — a second copy would drift and make the snapshots incomparable. */
export const OVERRIDE_KEYS: Record<string, string[]> = {
  fills: ['fill'], strokes: ['stroke'], strokeWeight: ['strokeWeight'],
  cornerRadius: ['radius'], topLeftRadius: ['radius'], topRightRadius: ['radius'], bottomLeftRadius: ['radius'], bottomRightRadius: ['radius'],
  itemSpacing: ['itemSpacing'], paddingLeft: ['paddingLeft'], paddingRight: ['paddingRight'], paddingTop: ['paddingTop'], paddingBottom: ['paddingBottom'],
  width: ['width', 'size'], height: ['height', 'size'], opacity: ['opacity'], visible: ['hidden'],
  characters: ['text'], fontSize: ['fontSize'], fontName: ['font', 'style'], fontFamily: ['font'], fontWeight: ['style'], lineHeight: ['lineHeightPx', 'lineHeightPercent'],
  componentProperties: ['cp'], mainComponent: ['i'],
  // Applied styles: the Plugin API names the override `textStyleId`, REST `inheritTextStyleId`.
  fillStyleId: ['st'], strokeStyleId: ['st'], effectStyleId: ['st'], textStyleId: ['st'],
  inheritFillStyleId: ['st'], inheritStrokeStyleId: ['st'], inheritEffectStyleId: ['st'], inheritTextStyleId: ['st'],
}

function paintHex(paint: Paint): string | undefined {
  if (paint.type !== 'SOLID' || !paint.color) return undefined
  const alpha = paint.opacity ?? 1
  return rgbaToHex({ ...paint.color, a: alpha })
}

async function describeNode(index: VariableIndex, node: SceneNode, path: string): Promise<SnapNode> {
  const bv = (node.boundVariables ?? {}) as Record<string, Bound>
  const b: Record<string, string> = {}
  const r: Record<string, unknown> = {}
  const bind = (key: string, value: string | undefined) => { if (value) b[key] = value }

  if ('fills' in node) {
    const fill = firstVisible(node.fills as readonly Paint[])
    if (fill) { const n = boundName(index, (fill as SolidPaint).boundVariables?.color); if (n) b.fill = n; else { const hex = paintHex(fill); if (hex) r.fill = hex } }
  }
  if ('strokes' in node) {
    const stroke = firstVisible(node.strokes)
    if (stroke) {
      const n = boundName(index, (stroke as SolidPaint).boundVariables?.color); if (n) b.stroke = n; else { const hex = paintHex(stroke); if (hex) r.stroke = hex }
      const w = boundName(index, bv.strokeWeight); if (w) b.strokeWeight = w; else if (typeof node.strokeWeight === 'number') r.strokeWeight = node.strokeWeight
    }
  }
  if ('cornerRadius' in node && node.cornerRadius !== 0) {
    const n = boundName(index, bv.topLeftRadius)
    if (n) b.radius = n
    else if (typeof node.cornerRadius === 'number') r.radius = node.cornerRadius
    else if ('topLeftRadius' in node) r.radius = [node.topLeftRadius, node.topRightRadius, node.bottomRightRadius, node.bottomLeftRadius]
  }
  if ('layoutMode' in node && node.layoutMode !== 'NONE') {
    r.layout = [node.layoutMode, node.primaryAxisAlignItems, node.counterAxisAlignItems, node.layoutSizingHorizontal, node.layoutSizingVertical].join(' ')
    for (const k of ['itemSpacing', 'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom'] as const) {
      const n = boundName(index, bv[k]); if (n) b[k] = n; else if (node[k]) r[k] = node[k]
    }
  }
  bind('width', boundName(index, bv.width))
  bind('height', boundName(index, bv.height))
  if (node.type !== 'TEXT') r.size = [Math.round(node.width * 10) / 10, Math.round(node.height * 10) / 10]
  if (node.type === 'TEXT') {
    r.text = node.characters
    for (const k of ['fontSize', 'fontFamily', 'fontWeight', 'lineHeight'] as const) bind(k, boundName(index, bv[k]))
    if (!bv.fontSize && typeof node.fontSize === 'number') r.fontSize = node.fontSize
    if (!bv.fontFamily && typeof node.fontName === 'object') { r.font = node.fontName.family; r.style = node.fontName.style }
    if (!bv.lineHeight && typeof node.lineHeight === 'object') {
      if (node.lineHeight.unit === 'PIXELS') r.lineHeightPx = node.lineHeight.value
      else if (node.lineHeight.unit === 'PERCENT') r.lineHeightPercent = node.lineHeight.value
    }
  }
  if ('opacity' in node && node.opacity !== 1) r.opacity = Math.round(node.opacity * 100) / 100
  if (!node.visible) r.hidden = true

  const entry: SnapNode = { id: node.id, p: path, t: node.type, b }
  if (Object.keys(r).length) entry.r = r
  const st = await styleRefs(node)
  if (st) entry.st = st
  if (node.type === 'INSTANCE') {
    const main = await node.getMainComponentAsync()
    entry.i = main ? `${main.name}${main.parent?.type === 'COMPONENT_SET' ? ` <${main.parent.name}>` : ''}` : 'unknown'
    if (main) entry.mc = main.id
    const cp: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(node.componentProperties)) cp[k.split('#')[0] ?? k] = v.value
    if (Object.keys(cp).length) entry.cp = cp
  }
  const refs = node.componentPropertyReferences
  if (refs && Object.keys(refs).length) {
    entry.pr = Object.fromEntries(Object.entries(refs).map(([k, v]) => [k, (v ?? '').split('#')[0] ?? '']))
  }
  return entry
}

/** Applied local or library styles by kind → style name. REST reports the same four kinds. */
async function styleRefs(node: SceneNode): Promise<Record<string, string> | undefined> {
  const ids: [string, unknown][] = [
    ['fill', 'fillStyleId' in node ? node.fillStyleId : undefined],
    ['stroke', 'strokeStyleId' in node ? node.strokeStyleId : undefined],
    ['effect', 'effectStyleId' in node ? node.effectStyleId : undefined],
    ['text', node.type === 'TEXT' ? node.textStyleId : undefined],
  ]
  const out: Record<string, string> = {}
  for (const [kind, id] of ids) {
    // Mixed (a symbol) or empty means no single style applies.
    if (typeof id !== 'string' || !id) continue
    const style = await figma.getStyleByIdAsync(id)
    if (style) out[kind] = style.name
  }
  return Object.keys(out).length ? out : undefined
}

/** Keep only the b/r keys that the instance actually overrides, so override nodes carry overrides and nothing else. */
export function pruneToOverrides(entry: SnapNode, fields: readonly string[]): SnapNode {
  const keep = new Set(fields.flatMap((f) => OVERRIDE_KEYS[f] ?? []))
  const b = Object.fromEntries(Object.entries(entry.b).filter(([k]) => keep.has(k)))
  const r = Object.fromEntries(Object.entries(entry.r ?? {}).filter(([k]) => keep.has(k)))
  const out: SnapNode = { ...(entry.id ? { id: entry.id } : {}), p: entry.p, t: entry.t, b, o: [...fields] }
  if (Object.keys(r).length) out.r = r
  if (keep.has('i') && entry.i) { out.i = entry.i; if (entry.mc) out.mc = entry.mc }
  if (keep.has('cp') && entry.cp) out.cp = entry.cp
  if (keep.has('st') && entry.st) out.st = entry.st
  return out
}

async function walk(index: VariableIndex, node: SceneNode, path: string, out: SnapNode[]): Promise<void> {
  const p = path ? `${path}/${node.name}` : node.name
  out.push(await describeNode(index, node, p))
  if (!('children' in node)) return
  if (node.type !== 'INSTANCE') { for (const child of node.children) await walk(index, child, p, out); return }
  // Instances belong to their own component set. Record only what this
  // instance overrides on its descendants (fills, radii, text…), flagged `o`,
  // so the generator can emit derived tokens for the overridden values.
  const overrides = new Map<string, readonly string[]>()
  for (const ov of node.overrides ?? []) if (ov.id !== node.id) overrides.set(ov.id, ov.overriddenFields)
  if (overrides.size === 0) return
  const visit = async (child: SceneNode, childPath: string): Promise<void> => {
    const fields = overrides.get(child.id)
    if (fields && fields.length) out.push(pruneToOverrides(await describeNode(index, child, childPath), fields))
    if ('children' in child) for (const grand of child.children) await visit(grand, `${childPath}/${grand.name}`)
  }
  for (const child of node.children) await visit(child, `${p}/${child.name}`)
}

function propDefinitions(node: ComponentNode | ComponentSetNode): ComponentSetSnapshot['props'] {
  const out: ComponentSetSnapshot['props'] = {}
  for (const [k, d] of Object.entries(node.componentPropertyDefinitions)) {
    out[k.split('#')[0] ?? k] = { type: d.type, ...(d.variantOptions ? { options: d.variantOptions } : {}), default: d.defaultValue }
  }
  return out
}

async function extractSet(index: VariableIndex, code: string, id: string): Promise<ComponentSetSnapshot> {
  const node = await figma.getNodeByIdAsync(id)
  // Screens (plain frames such as the Login page) are snapshotted as single-variant sets.
  if (!node || (node.type !== 'COMPONENT_SET' && node.type !== 'COMPONENT' && node.type !== 'FRAME')) throw new Error(`Node ${id} is not a component (set) or frame`)
  const variantsSource: (ComponentNode | FrameNode)[] = node.type === 'COMPONENT_SET' ? node.children.filter((c): c is ComponentNode => c.type === 'COMPONENT') : [node]
  await indexLibraryVariables(index, node)
  const variants: ComponentSetSnapshot['variants'] = []
  for (const variant of variantsSource) {
    const nodes: SnapNode[] = []
    await walk(index, variant, '', nodes)
    variants.push({ id: variant.id, ...(variant.type === 'COMPONENT' && variant.key ? { key: variant.key } : {}), name: variant.name, props: node.type === 'COMPONENT_SET' ? parseVariantName(variant.name) : {}, nodes })
  }
  const key = node.type === 'FRAME' ? undefined : node.key
  return { code, id: node.id, ...(key ? { key } : {}), name: node.name, description: node.type === 'FRAME' ? '' : node.description, props: node.type === 'FRAME' ? {} : propDefinitions(node), variants }
}

function coverageOf(index: VariableIndex, top: SceneNode): { bound: number; raw: number } {
  const nodes: SceneNode[] = [top, ...('findAll' in top ? top.findAll(() => true) : [])]
  let bound = 0
  let raw = 0
  for (const n of nodes) {
    const bv = (n.boundVariables ?? {}) as Record<string, Bound>
    if ('fills' in n && Array.isArray(n.fills)) for (const f of n.fills) if (f.type === 'SOLID' && f.visible !== false) { if (f.boundVariables?.color) bound++; else raw++ }
    if ('strokes' in n) for (const s of n.strokes) if (s.type === 'SOLID' && s.visible !== false) { if (s.boundVariables?.color) bound++; else raw++ }
    if ('cornerRadius' in n && typeof n.cornerRadius === 'number' && n.cornerRadius > 0) { if (bv.topLeftRadius) bound++; else raw++ }
    if ('layoutMode' in n && n.layoutMode !== 'NONE') for (const k of ['itemSpacing', 'paddingLeft', 'paddingTop', 'paddingRight', 'paddingBottom'] as const) if (n[k] > 0) { if (bv[k]) bound++; else raw++ }
    if (n.type === 'TEXT') { if (bv.fontSize || bv.fontFamily) bound++; else raw++ }
  }
  void index
  return { bound, raw }
}

async function extractCoverage(index: VariableIndex, layout: PageLayout): Promise<CoverageRow[]> {
  const pages: PageNode[] = []
  for (const ref of layout.pages) {
    const page = await figma.getNodeByIdAsync(ref.id)
    if (!page || page.type !== 'PAGE') throw new Error(`Page ${ref.id} (${ref.name}) not found`)
    await page.loadAsync()
    pages.push(page)
  }
  return placeComponents<SceneNode | PageNode>({ kind: layout.kind, pages }, layout.pages)
    .filter((p) => inCoverage(layout.kind, p))
    .map(({ node, tier, group }) => {
      const top = node as ComponentNode | ComponentSetNode
      const { bound, raw } = coverageOf(index, top)
      return {
        section: tier ?? '',
        ...(group && group !== tier ? { group } : {}),
        type: top.type,
        name: top.name.trim(),
        id: top.id,
        variants: top.type === 'COMPONENT_SET' ? top.children.length : 1,
        coverage: bound + raw ? Math.round((100 * bound) / (bound + raw)) : null,
      }
    })
}

/** Tier pages when the file has them, else the legacy Components page (see componentPages.ts). */
function layoutOf(manifest: ExtractManifest): PageLayout {
  const filePages = (figma.root.children ?? []).map((p) => ({ id: p.id, name: p.name }))
  return resolveLayout(manifest, filePages)
}

export async function extractComponents(manifest: ExtractManifest): Promise<ComponentsSnapshot> {
  const index = await indexVariables()
  const layout = layoutOf(manifest)
  const coverage = await extractCoverage(index, layout)
  const sets: ComponentSetSnapshot[] = []
  for (const set of manifest.componentSets) sets.push(await extractSet(index, set.code, set.id))
  const page = layout.pages[0] ?? manifest.componentsPage
  return { fileKey: manifest.fileKey, page, ...(layout.kind === 'tiered' ? { pages: layout.pages } : {}), pulledAt: today(), sets, coverage }
}

// --------------------------------------------------------------------- icons

export function iconKey(variantName: string, variantProperty: string): string {
  return variantName
    .replace(new RegExp(`^${variantProperty}=`), '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function extractIcons(manifest: ExtractManifest): Promise<IconsSnapshot> {
  const set = await figma.getNodeByIdAsync(manifest.iconSet.id)
  if (!set || set.type !== 'COMPONENT_SET') throw new Error(`Icon set ${manifest.iconSet.id} not found`)
  const icons: IconsSnapshot['icons'] = {}
  for (const variant of set.children) {
    const svg = await variant.exportAsync({ format: 'SVG_STRING', svgOutlineText: true, svgIdAttribute: false, svgSimplifyStroke: true })
    icons[iconKey(variant.name, manifest.iconSet.variantProperty)] = { id: variant.id, name: variant.name.replace(`${manifest.iconSet.variantProperty}=`, ''), svg }
  }
  return { fileKey: manifest.fileKey, set: manifest.iconSet, icons, marks: {} }
}

export async function extractAll(manifest: ExtractManifest) {
  return { tokens: await extractTokens(manifest), components: await extractComponents(manifest), icons: await extractIcons(manifest) }
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}
