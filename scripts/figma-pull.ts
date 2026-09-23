// Pull the Figma snapshot into figma/*.json.
//
//   npm run figma:pull                 # backend=plugin (default): through the live-mode relay
//   npm run figma:pull -- --rest       # backend=rest: Figma REST API (needs FIGMA_TOKEN)
//
// plugin backend — works on every Figma plan. Needs the relay and the bridge
//   page running (see README "Live mode"); the sandbox handler `figma:snapshot`
//   runs src/shared/brand/extract.ts inside Figma and streams the JSON back.
//
// rest backend — GET /v1/files/:key/variables/local is Enterprise-only. Component
//   nodes (props, bindings, geometry) come from /v1/files/:key/nodes, which works
//   on every plan, so on a 403 for variables the pull keeps the live components and
//   falls back to the relay for variables, then to the committed figma/tokens.json
//   with `tokensStale` set. It never pretends variables are current.
//
// Also imported by scripts/figma-diff.ts, which pulls into memory and never writes.
import { writeFileSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { WebSocket } from 'ws'
import type { ComponentsSnapshot, IconsSnapshot, TokenSnapshot } from '../src/shared/brand/snapshot'
import { parseVariantName } from '../src/shared/brand/snapshot'
import type { ExtractManifest } from '../src/shared/brand/extract'
import { iconKey, pruneToOverrides } from '../src/shared/brand/extract'
import { rgbaToHex } from '../src/shared/figma/color'

export const ROOT = resolve(import.meta.dirname, '..')

export type Backend = 'plugin' | 'rest'
export interface PullOptions {
  backend: Backend
  /** Relay auth token (`--token`). */
  token?: string
  root?: string
  /** Relay response timeout. Short when the relay is only a fallback for variables. */
  timeoutMs?: number
}

export interface Snapshot {
  tokens: TokenSnapshot
  components: ComponentsSnapshot
  icons: IconsSnapshot
  /** Which extractor produced the component data. The two do not describe a file identically —
   *  extract.ts walks into instances and records their overrides, the REST describe() stops at the
   *  instance — so comparing a snapshot from one against a snapshot from the other is meaningless
   *  below set level. figma-diff refuses to do it. */
  source?: 'figma-plugin' | 'figma-rest'
  /** True when `tokens` came from the committed file because no live source was reachable. */
  tokensStale?: boolean
  /** True when /variables/local was denied, so bound properties could not be resolved to variable
   *  names and came back as `lib:VariableID:…` placeholders. Every binding then looks rebound. */
  bindingsUnnamed?: boolean
}

type Manifest = ExtractManifest & { iconSet: ExtractManifest['iconSet'] }

export function parseArgs(argv: string[]): PullOptions {
  const tokenIdx = argv.indexOf('--token')
  const token = tokenIdx >= 0 ? argv[tokenIdx + 1] : undefined
  return { backend: argv.includes('--rest') ? 'rest' : 'plugin', ...(token ? { token } : {}) }
}

export function readManifest(root = ROOT): Manifest {
  return JSON.parse(readFileSync(resolve(root, 'figma/manifest.json'), 'utf8')) as Manifest
}

/** The snapshot as committed in figma/*.json — the baseline figma:diff compares against. */
export function readCommitted(root = ROOT): Snapshot {
  const read = <T>(rel: string) => JSON.parse(readFileSync(resolve(root, rel), 'utf8')) as T
  return {
    tokens: read<TokenSnapshot>('figma/tokens.json'),
    components: read<ComponentsSnapshot>('figma/components.json'),
    icons: read<IconsSnapshot>('figma/icons.json'),
  }
}

export async function pullSnapshot(options: PullOptions): Promise<Snapshot> {
  const root = options.root ?? ROOT
  const manifest = readManifest(root)
  return options.backend === 'rest' ? pullRest(manifest, root, options) : pullPlugin(manifest, options)
}

/** Fold the code-side bookkeeping the snapshot itself does not carry back into a freshly pulled one.
 *  Both the writer and the differ must do this or every run reports it as drift. */
export function mergeCommitted(snapshot: Snapshot, root = ROOT): Snapshot {
  const existingIcons = JSON.parse(readFileSync(resolve(root, 'figma/icons.json'), 'utf8')) as IconsSnapshot
  const existingComponents = JSON.parse(readFileSync(resolve(root, 'figma/components.json'), 'utf8')) as ComponentsSnapshot & { tiers?: unknown; standaloneIcons?: unknown }
  // Only the "Tab Icons" set is re-exported; glyphs exported by hand from other sets
  // (status, section, toolbar, principle… see docs) and the checkbox marks are kept.
  const icons: IconsSnapshot = {
    ...snapshot.icons,
    icons: { ...existingIcons.icons, ...snapshot.icons.icons },
    marks: Object.keys(snapshot.icons.marks).length ? snapshot.icons.marks : existingIcons.marks,
  }
  // Code-side bookkeeping (status/aliasOf per set, tiers, standalone icons) lives only in the committed file.
  const bookkeeping = new Map(existingComponents.sets.map((s) => [s.id, s]))
  const sets = snapshot.components.sets.map((s) => {
    const prev = bookkeeping.get(s.id)
    return { ...s, ...(prev?.status ? { status: prev.status } : {}), ...(prev?.aliasOf ? { aliasOf: prev.aliasOf } : {}), ...(prev?.dir ? { dir: prev.dir } : {}) }
  })
  const components = {
    ...snapshot.components,
    sets,
    ...(existingComponents.tiers ? { tiers: existingComponents.tiers } : {}),
    ...(existingComponents.standaloneIcons ? { standaloneIcons: existingComponents.standaloneIcons } : {}),
  }
  return { ...snapshot, components, icons }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const snapshot = mergeCommitted(await pullSnapshot(options))
  write('figma/tokens.json', snapshot.tokens)
  write('figma/components.json', snapshot.components)
  write('figma/icons.json', snapshot.icons)
  if (snapshot.tokensStale) console.warn('[figma:pull] variables were NOT refreshed (no Enterprise REST access and no relay) — figma/tokens.json is unchanged')
  console.log(`[figma:pull] ${options.backend}: ${snapshot.tokens.collections.map((c) => `${c.name}=${c.variables.length}`).join(' ')} · ${snapshot.components.sets.length} sets · ${Object.keys(snapshot.icons.icons).length} icons`)
  console.log('[figma:pull] next: npm run gen:tokens && npm run tokens:check')
}

function write(rel: string, data: unknown) {
  writeFileSync(resolve(ROOT, rel), `${JSON.stringify(data, null, 2)}\n`)
}

// ------------------------------------------------------------ plugin backend

function pullPlugin(manifest: Manifest, options: PullOptions): Promise<Snapshot> {
  const url = new URL('ws://localhost:4001')
  url.searchParams.set('role', 'browser')
  if (options.token) url.searchParams.set('token', options.token)
  return new Promise((resolvePromise, reject) => {
    const ws = new WebSocket(url.toString())
    const id = `pull${Date.now().toString(36)}`
    let connected = false
    // The relay accepts us as `role=browser` whether or not Figma is on the other side, and
    // silently drops the request when it is not (tools/relay/server.ts). So a timeout after a
    // successful connect means the bridge is not open — a different fix from the relay being down.
    const timer = setTimeout(() => {
      ws.close()
      reject(new Error(connected
        ? 'The relay is running but nothing answered from Figma — the bridge is not connected. In Figma desktop: Plugins → Development → bluebird → "Dev: connect to browser (live mode)".'
        : 'Could not reach the relay on ws://localhost:4001. Start it with `npm run dev:relay`.'))
    }, options.timeoutMs ?? 600_000)
    ws.on('open', () => { connected = true; ws.send(JSON.stringify({ kind: 'request', id, type: 'figma:snapshot', payload: manifest })) })
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString()) as { kind: string; id?: string; ok?: boolean; data?: Snapshot; error?: string }
      if (message.kind !== 'response' || message.id !== id) return
      clearTimeout(timer)
      ws.close()
      if (message.ok && message.data) resolvePromise({ ...message.data, source: 'figma-plugin' })
      else reject(new Error(message.error ?? 'figma:snapshot failed'))
    })
    ws.on('error', (error) => { clearTimeout(timer); reject(error) })
  })
}

// -------------------------------------------------------------- rest backend

interface RestPaint { type: string; visible?: boolean; opacity?: number; color?: { r: number; g: number; b: number; a?: number }; boundVariables?: { color?: { id: string } } }
interface RestComponentMeta { name: string; componentSetId?: string }
interface RestVariable { id: string; name: string; resolvedType: TokenSnapshot['collections'][number]['variables'][number]['type']; variableCollectionId: string; valuesByMode: Record<string, unknown> }
interface RestCollection { id: string; name: string; modes: { modeId: string; name: string }[]; defaultModeId: string; variableIds: string[] }
interface RestNode {
  id: string; name: string; type: string; visible?: boolean; opacity?: number; children?: RestNode[]
  fills?: RestPaint[]
  strokes?: RestPaint[]
  strokeWeight?: number; cornerRadius?: number; layoutMode?: string
  rectangleCornerRadii?: [number, number, number, number]
  primaryAxisAlignItems?: string; counterAxisAlignItems?: string; layoutSizingHorizontal?: string; layoutSizingVertical?: string
  itemSpacing?: number; paddingLeft?: number; paddingRight?: number; paddingTop?: number; paddingBottom?: number
  absoluteBoundingBox?: { width: number; height: number }
  characters?: string
  style?: { fontSize?: number; fontFamily?: string; fontWeight?: number; fontPostScriptName?: string; lineHeightPx?: number; lineHeightPercentFontSize?: number; lineHeightUnit?: string }
  boundVariables?: Record<string, { id: string } | { id: string }[]>
  componentPropertyDefinitions?: Record<string, { type: string; variantOptions?: string[]; defaultValue: unknown }>
  componentPropertyReferences?: Record<string, string>
  componentProperties?: Record<string, { value: unknown }>
  componentId?: string
  description?: string
  overrides?: { id: string; overriddenFields: string[] }[]
}

class FigmaHttpError extends Error {
  constructor(readonly status: number, message: string) { super(message) }
}

async function figmaGet<T>(path: string): Promise<T> {
  const token = process.env.FIGMA_TOKEN
  if (!token) throw new Error('FIGMA_TOKEN is not set (personal access token with file_variables:read, file_content:read)')
  const res = await fetch(`https://api.figma.com/v1${path}`, { headers: { 'X-Figma-Token': token } })
  if (!res.ok) throw new FigmaHttpError(res.status, `Figma API ${res.status} for ${path}: ${await res.text()}`)
  return res.json() as Promise<T>
}

/** Mirrors extract.ts `paintHex`: solid colour + the paint's own opacity, via the same rgbaToHex. */
function paintHex(paint: RestPaint | undefined): string | undefined {
  if (!paint || paint.type !== 'SOLID' || !paint.color) return undefined
  return rgbaToHex({ r: paint.color.r, g: paint.color.g, b: paint.color.b, a: paint.opacity ?? 1 })
}

function restColorToHex(c: { r: number; g: number; b: number; a?: number }): string {
  const h = (n: number) => Math.round(Math.min(1, Math.max(0, n)) * 255).toString(16).padStart(2, '0')
  const a = c.a ?? 1
  return `#${h(c.r)}${h(c.g)}${h(c.b)}${a < 1 ? h(a) : ''}`
}

/** Variables by id, needed to name the bindings on component nodes even when /variables/local is denied. */
async function restVariableIndex(manifest: Manifest): Promise<{ byId: Record<string, RestVariable>; collections: RestCollection[] }> {
  const vars = await figmaGet<{ meta: { variables: Record<string, RestVariable>; variableCollections: Record<string, RestCollection> } }>(`/files/${manifest.fileKey}/variables/local`)
  return { byId: vars.meta.variables, collections: Object.values(vars.meta.variableCollections) }
}

/** id → name for every variable the last relay pull recorded.
 *
 *  This is the way around the Enterprise gate. REST hands back node bindings as ids
 *  (`VariableID:40000012:5102`) and only /v1/files/:key/variables/local — Enterprise only —
 *  can name them. But Figma variable ids are stable for the life of the file, and the relay
 *  extractor writes them into figma/tokens.json. So one relay pull seeds a map that every later
 *  REST pull can reuse offline. Only variables created or deleted since that pull are unknown,
 *  and those are reported rather than silently labelled `lib:`. */
function namesFromCommitted(root: string): Map<string, string> {
  const out = new Map<string, string>()
  try {
    for (const c of readCommitted(root).tokens.collections) for (const v of c.variables) if (v.id) out.set(v.id, v.name)
  } catch { /* no committed snapshot yet */ }
  return out
}

function restTokens(manifest: Manifest, byId: Record<string, RestVariable>, collections: RestCollection[]): TokenSnapshot {
  const resolveValue = (value: unknown, modeId: string, depth = 0): TokenSnapshot['collections'][number]['variables'][number]['values'][string] => {
    if (value === undefined || depth > 10) return null
    if (typeof value === 'object' && value !== null && (value as { type?: string }).type === 'VARIABLE_ALIAS') {
      const target = byId[(value as { id: string }).id]
      if (!target) return null
      return resolveValue(target.valuesByMode[modeId] ?? Object.values(target.valuesByMode)[0], modeId, depth + 1)
    }
    if (typeof value === 'object' && value !== null && 'r' in (value as object)) return restColorToHex(value as { r: number; g: number; b: number; a?: number })
    return value as string | number | boolean
  }
  const collectionsById = Object.fromEntries(collections.map((c) => [c.id, c]))
  return {
    fileKey: manifest.fileKey, fileName: '', pulledAt: new Date().toISOString().slice(0, 10), source: 'figma-rest',
    collections: Object.entries(manifest.collections).map(([key, name]) => {
      const c = collections.find((col) => col.name === name)
      if (!c) throw new Error(`Collection "${name}" not found`)
      return {
        name: c.name, key, modes: c.modes.map((m) => m.name),
        defaultMode: c.modes.find((m) => m.modeId === c.defaultModeId)?.name ?? '',
        variables: c.variableIds.map((id) => byId[id]!).filter(Boolean).map((v) => {
          const values: Record<string, ReturnType<typeof resolveValue>> = {}
          const aliases: Record<string, string> = {}
          for (const m of c.modes) {
            const raw = v.valuesByMode[m.modeId]
            values[m.name] = resolveValue(raw, m.modeId)
            if (typeof raw === 'object' && raw !== null && (raw as { type?: string }).type === 'VARIABLE_ALIAS') {
              const t = byId[(raw as { id: string }).id]
              if (t) aliases[m.name] = `${collectionsById[t.variableCollectionId]?.name}/${t.name}`
            }
          }
          return { name: v.name, type: v.resolvedType, values, ...(Object.keys(aliases).length ? { aliases } : {}) }
        }),
      }
    }),
  }
}

async function pullRest(manifest: Manifest, root: string, options: PullOptions): Promise<Snapshot> {
  // /variables/local is Enterprise-only. Components, props, bindings and geometry are not,
  // so a 403 costs us the variables and nothing else.
  let byId: Record<string, RestVariable> = {}
  let names = new Map<string, string>()
  let tokens: TokenSnapshot | undefined
  let tokensStale = false
  let bindingsUnnamed = false
  try {
    const index = await restVariableIndex(manifest)
    byId = index.byId
    tokens = restTokens(manifest, index.byId, index.collections)
  } catch (error) {
    if (!(error instanceof FigmaHttpError) || (error.status !== 403 && error.status !== 404)) throw error
    console.warn(`[figma:pull] /variables/local denied (${error.status}) — this file's plan has no variables REST access. Trying the relay for variables…`)
    try {
      const live = await pullPlugin(manifest, { ...options, timeoutMs: 30_000 })
      tokens = live.tokens
    } catch {
      tokens = readCommitted(root).tokens
      tokensStale = true
      names = namesFromCommitted(root)
      if (names.size) {
        console.warn(`[figma:pull] relay unreachable — variable VALUES are NOT checked this run, but ${names.size} variable ids from the last relay pull will name the node bindings.`)
      } else {
        console.warn('[figma:pull] relay unreachable and figma/tokens.json records no variable ids, so bindings cannot be named.')
        console.warn('[figma:pull] Run `npm run figma:pull` once through the relay to record them; after that REST pulls resolve bindings on their own.')
        bindingsUnnamed = true
      }
    }
  }

  const ids = [...manifest.componentSets.map((s) => s.id), manifest.iconSet.id].join(',')
  const nodes = await figmaGet<{ nodes: Record<string, { document: RestNode; components?: Record<string, RestComponentMeta>; componentSets?: Record<string, { name: string }> }> }>(`/files/${manifest.fileKey}/nodes?ids=${encodeURIComponent(ids)}`)
  // The response carries the file's component tables; extract.ts names an instance's main
  // component (and its set), so build the same name here instead of leaking a raw componentId.
  const componentMeta = new Map<string, RestComponentMeta>()
  const setNames = new Map<string, string>()
  for (const entry of Object.values(nodes.nodes)) {
    for (const [id, meta] of Object.entries(entry.components ?? {})) componentMeta.set(id, meta)
    for (const [id, meta] of Object.entries(entry.componentSets ?? {})) setNames.set(id, meta.name)
  }
  const componentName = (id: string | undefined) => {
    const meta = id ? componentMeta.get(id) : undefined
    if (!meta) return 'unknown'
    const setName = meta.componentSetId ? setNames.get(meta.componentSetId) : undefined
    return `${meta.name}${setName ? ` <${setName}>` : ''}`
  }
  // Live index when the plan allows it, otherwise the ids recorded by the last relay pull.
  // `lib:` is the same fallback extract.ts uses for remote library variables.
  const unknownIds = new Set<string>()
  const nameOf = (b: { id: string } | { id: string }[] | undefined) => {
    const f = Array.isArray(b) ? b[0] : b
    if (!f) return undefined
    const name = byId[f.id]?.name ?? names.get(f.id)
    if (name) return name
    unknownIds.add(f.id)
    return `lib:${f.id}`
  }
  type SnapNode = ComponentsSnapshot['sets'][number]['variants'][number]['nodes'][number]
  /** One node → one snapshot entry, at the path it is given. Mirrors extract.ts `describeNode`. */
  const describeNode = (node: RestNode, p: string): SnapNode => {
    const bv = node.boundVariables ?? {}
    const b: Record<string, string> = {}
    const r: Record<string, unknown> = {}
    const fill = node.fills?.find((f) => f.visible !== false)
    if (fill) { const n = nameOf(fill.boundVariables?.color); if (n) b.fill = n; else { const hex = paintHex(fill); if (hex) r.fill = hex } }
    const stroke = node.strokes?.find((x) => x.visible !== false)
    if (stroke) {
      const n = nameOf(stroke.boundVariables?.color); if (n) b.stroke = n; else { const hex = paintHex(stroke); if (hex) r.stroke = hex }
      const w = nameOf(bv.strokeWeight); if (w) b.strokeWeight = w; else if (typeof node.strokeWeight === 'number') r.strokeWeight = node.strokeWeight
    }
    if (node.cornerRadius !== 0 && (node.cornerRadius !== undefined || node.rectangleCornerRadii)) {
      const n = nameOf(bv.topLeftRadius)
      if (n) b.radius = n
      else if (typeof node.cornerRadius === 'number') r.radius = node.cornerRadius
      else if (node.rectangleCornerRadii) { const [tl, tr, br, bl] = node.rectangleCornerRadii; r.radius = [tl, tr, br, bl] }
    }
    if (node.layoutMode && node.layoutMode !== 'NONE') {
      r.layout = [node.layoutMode, node.primaryAxisAlignItems, node.counterAxisAlignItems, node.layoutSizingHorizontal, node.layoutSizingVertical].join(' ')
      for (const k of ['itemSpacing', 'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom'] as const) { const n = nameOf(bv[k]); if (n) b[k] = n; else if (node[k]) r[k] = node[k] }
    }
    for (const k of ['width', 'height'] as const) { const n = nameOf(bv[k]); if (n) b[k] = n }
    // extract.ts rounds to one decimal; matching it exactly keeps the two snapshots comparable.
    if (node.type !== 'TEXT' && node.absoluteBoundingBox) r.size = [Math.round(node.absoluteBoundingBox.width * 10) / 10, Math.round(node.absoluteBoundingBox.height * 10) / 10]
    if (node.type === 'TEXT') {
      r.text = node.characters
      for (const k of ['fontSize', 'fontFamily', 'fontWeight', 'lineHeight'] as const) { const n = nameOf(bv[k]); if (n) b[k] = n }
      if (!bv.fontSize && typeof node.style?.fontSize === 'number') r.fontSize = node.style.fontSize
      if (!bv.fontFamily && node.style?.fontFamily) { r.font = node.style.fontFamily; if (node.style.fontPostScriptName) r.style = node.style.fontPostScriptName.split('-')[1] ?? 'Regular' }
      if (!bv.lineHeight && node.style) {
        if (node.style.lineHeightUnit === 'PIXELS' && typeof node.style.lineHeightPx === 'number') r.lineHeightPx = node.style.lineHeightPx
        else if (typeof node.style.lineHeightPercentFontSize === 'number') r.lineHeightPercent = node.style.lineHeightPercentFontSize
      }
    }
    if (node.opacity !== undefined && node.opacity !== 1) r.opacity = Math.round(node.opacity * 100) / 100
    if (node.visible === false) r.hidden = true
    const entry: SnapNode = { p, t: node.type, b }
    if (Object.keys(r).length) entry.r = r
    if (node.type === 'INSTANCE') {
      // extract.ts records the main component's NAME ("Rating=A <Rating>"), not its id, so resolve
      // componentId through the file's own component table rather than leaking a raw id.
      entry.i = componentName(node.componentId)
      const cp: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(node.componentProperties ?? {})) cp[k.split('#')[0] ?? k] = v.value
      if (Object.keys(cp).length) entry.cp = cp
    }
    const refs = node.componentPropertyReferences
    if (refs && Object.keys(refs).length) entry.pr = Object.fromEntries(Object.entries(refs).map(([k, v]) => [k, (v ?? '').split('#')[0] ?? '']))
    return entry
  }
  /** Mirrors extract.ts `walk`. */
  const describe = (node: RestNode, path: string, out: SnapNode[]) => {
    const p = path ? `${path}/${node.name}` : node.name
    out.push(describeNode(node, p))
    if (!node.children) return
    if (node.type !== 'INSTANCE') { for (const c of node.children) describe(c, p, out); return }
    // Instances belong to their own set; record only what THIS instance overrides on its
    // descendants, exactly as extract.ts does — same OVERRIDE_KEYS, same pruning — so a snapshot
    // from either backend describes the file identically and the two stay comparable.
    const overrides = new Map<string, readonly string[]>()
    for (const ov of node.overrides ?? []) if (ov.id !== node.id) overrides.set(ov.id, ov.overriddenFields)
    if (!overrides.size) return
    const visit = (child: RestNode, childPath: string) => {
      const fields = overrides.get(child.id)
      if (fields?.length) out.push(pruneToOverrides(describeNode(child, childPath), fields))
      if (child.children) for (const grand of child.children) visit(grand, `${childPath}/${grand.name}`)
    }
    for (const c of node.children) visit(c, `${p}/${c.name}`)
  }
  const sets: ComponentsSnapshot['sets'] = manifest.componentSets.map((set) => {
    const doc = nodes.nodes[set.id]?.document
    if (!doc) throw new Error(`Node ${set.id} (${set.figma}) not returned by the API`)
    const variantsSource = doc.type === 'COMPONENT_SET' ? (doc.children ?? []).filter((c) => c.type === 'COMPONENT') : [doc]
    const props: ComponentsSnapshot['sets'][number]['props'] = {}
    for (const [k, d] of Object.entries(doc.componentPropertyDefinitions ?? {})) props[k.split('#')[0] ?? k] = { type: d.type, ...(d.variantOptions ? { options: d.variantOptions } : {}), default: d.defaultValue }
    return {
      code: set.code, id: doc.id, name: doc.name, description: doc.description ?? '', props,
      variants: variantsSource.map((v) => { const out: SnapNode[] = []; describe(v, '', out); return { id: v.id, name: v.name, props: doc.type === 'COMPONENT_SET' ? parseVariantName(v.name) : {}, nodes: out } }),
    }
  })
  const existing = JSON.parse(readFileSync(resolve(root, 'figma/components.json'), 'utf8')) as ComponentsSnapshot
  const components: ComponentsSnapshot = { fileKey: manifest.fileKey, page: manifest.componentsPage, pulledAt: tokens.pulledAt, sets, coverage: existing.coverage }

  const iconDoc = nodes.nodes[manifest.iconSet.id]?.document
  const iconVariants = (iconDoc?.children ?? []).filter((c) => c.type === 'COMPONENT')
  const images = await figmaGet<{ images: Record<string, string> }>(`/images/${manifest.fileKey}?ids=${encodeURIComponent(iconVariants.map((v) => v.id).join(','))}&format=svg`)
  const icons: IconsSnapshot['icons'] = {}
  for (const v of iconVariants) {
    const url = images.images[v.id]
    if (!url) continue
    const svg = await (await fetch(url)).text()
    icons[iconKey(v.name, manifest.iconSet.variantProperty)] = { id: v.id, name: v.name.replace(`${manifest.iconSet.variantProperty}=`, ''), svg }
  }
  return { tokens, components, icons: { fileKey: manifest.fileKey, set: manifest.iconSet, icons, marks: {} }, source: 'figma-rest', ...(tokensStale ? { tokensStale } : {}), ...(bindingsUnnamed ? { bindingsUnnamed } : {}) }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  await main().catch((error: unknown) => { console.error(`[figma:pull] ${error instanceof Error ? error.message : String(error)}`); process.exit(1) })
}
