// Pull the Figma snapshot into figma/*.json.
//
//   npm run figma:pull                 # backend=plugin (default): through the live-mode relay
//   npm run figma:pull -- --rest       # backend=rest: Figma REST API (needs FIGMA_TOKEN)
//
// plugin backend — works on every Figma plan. Needs the relay and the bridge
//   page running (see README "Live mode"); the sandbox handler `figma:snapshot`
//   runs src/shared/brand/extract.ts inside Figma and streams the JSON back.
//
// rest backend — GET /v1/files/:key/variables/local is Enterprise-only. It
//   returns the same shapes (variables, component bindings, icon SVGs) so CI
//   can refresh the snapshot without a running Figma desktop.
import { writeFileSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { WebSocket } from 'ws'
import type { ComponentsSnapshot, IconsSnapshot, TokenSnapshot } from '../src/shared/brand/snapshot'
import { parseVariantName } from '../src/shared/brand/snapshot'
import type { ExtractManifest } from '../src/shared/brand/extract'
import { iconKey } from '../src/shared/brand/extract'

const root = resolve(import.meta.dirname, '..')
const manifest = JSON.parse(readFileSync(resolve(root, 'figma/manifest.json'), 'utf8')) as ExtractManifest & { iconSet: ExtractManifest['iconSet'] }
const args = process.argv.slice(2)
const backend = args.includes('--rest') ? 'rest' : 'plugin'

interface Snapshot { tokens: TokenSnapshot; components: ComponentsSnapshot; icons: IconsSnapshot }

async function main() {
  const snapshot = backend === 'rest' ? await pullRest() : await pullPlugin()
  const existingIcons = JSON.parse(readFileSync(resolve(root, 'figma/icons.json'), 'utf8')) as IconsSnapshot
  // Checkbox marks are not part of the icon set; keep the committed exports.
  snapshot.icons.marks = Object.keys(snapshot.icons.marks).length ? snapshot.icons.marks : existingIcons.marks
  write('figma/tokens.json', snapshot.tokens)
  write('figma/components.json', snapshot.components)
  write('figma/icons.json', snapshot.icons)
  console.log(`[figma:pull] ${backend}: ${snapshot.tokens.collections.map((c) => `${c.name}=${c.variables.length}`).join(' ')} · ${snapshot.components.sets.length} sets · ${Object.keys(snapshot.icons.icons).length} icons`)
  console.log('[figma:pull] next: npm run gen:tokens && npm run tokens:check')
}

function write(rel: string, data: unknown) {
  writeFileSync(resolve(root, rel), `${JSON.stringify(data, null, 2)}\n`)
}

// ------------------------------------------------------------ plugin backend

function pullPlugin(): Promise<Snapshot> {
  const tokenIdx = args.indexOf('--token')
  const token = tokenIdx >= 0 ? args[tokenIdx + 1] : undefined
  const url = new URL('ws://127.0.0.1:4001')
  url.searchParams.set('role', 'browser')
  if (token) url.searchParams.set('token', token)
  return new Promise((resolvePromise, reject) => {
    const ws = new WebSocket(url.toString())
    const id = `pull${Date.now().toString(36)}`
    const timer = setTimeout(() => { ws.close(); reject(new Error('Timed out waiting for Figma. Is the relay running and the bridge plugin open?')) }, 120_000)
    ws.on('open', () => ws.send(JSON.stringify({ kind: 'request', id, type: 'figma:snapshot', payload: manifest })))
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString()) as { kind: string; id?: string; ok?: boolean; data?: Snapshot; error?: string }
      if (message.kind !== 'response' || message.id !== id) return
      clearTimeout(timer)
      ws.close()
      if (message.ok && message.data) resolvePromise(message.data)
      else reject(new Error(message.error ?? 'figma:snapshot failed'))
    })
    ws.on('error', (error) => { clearTimeout(timer); reject(error) })
  })
}

// -------------------------------------------------------------- rest backend

interface RestVariable { id: string; name: string; resolvedType: TokenSnapshot['collections'][number]['variables'][number]['type']; variableCollectionId: string; valuesByMode: Record<string, unknown> }
interface RestCollection { id: string; name: string; modes: { modeId: string; name: string }[]; defaultModeId: string; variableIds: string[] }
interface RestNode {
  id: string; name: string; type: string; visible?: boolean; opacity?: number; children?: RestNode[]
  fills?: { type: string; visible?: boolean; boundVariables?: { color?: { id: string } } }[]
  strokes?: { type: string; visible?: boolean; boundVariables?: { color?: { id: string } } }[]
  strokeWeight?: number; cornerRadius?: number; layoutMode?: string
  primaryAxisAlignItems?: string; counterAxisAlignItems?: string; layoutSizingHorizontal?: string; layoutSizingVertical?: string
  itemSpacing?: number; paddingLeft?: number; paddingRight?: number; paddingTop?: number; paddingBottom?: number
  absoluteBoundingBox?: { width: number; height: number }
  characters?: string; style?: { fontSize?: number; fontFamily?: string; fontPostScriptName?: string }
  boundVariables?: Record<string, { id: string } | { id: string }[]>
  componentPropertyDefinitions?: Record<string, { type: string; variantOptions?: string[]; defaultValue: unknown }>
  componentPropertyReferences?: Record<string, string>
  componentProperties?: Record<string, { value: unknown }>
  componentId?: string
  description?: string
}

async function figmaGet<T>(path: string): Promise<T> {
  const token = process.env.FIGMA_TOKEN
  if (!token) throw new Error('FIGMA_TOKEN is not set (personal access token with file_variables:read, file_content:read)')
  const res = await fetch(`https://api.figma.com/v1${path}`, { headers: { 'X-Figma-Token': token } })
  if (!res.ok) throw new Error(`Figma API ${res.status} for ${path}: ${await res.text()}`)
  return res.json() as Promise<T>
}

function restColorToHex(c: { r: number; g: number; b: number; a?: number }): string {
  const h = (n: number) => Math.round(Math.min(1, Math.max(0, n)) * 255).toString(16).padStart(2, '0')
  const a = c.a ?? 1
  return `#${h(c.r)}${h(c.g)}${h(c.b)}${a < 1 ? h(a) : ''}`
}

async function pullRest(): Promise<Snapshot> {
  const vars = await figmaGet<{ meta: { variables: Record<string, RestVariable>; variableCollections: Record<string, RestCollection> } }>(`/files/${manifest.fileKey}/variables/local`)
  const byId = vars.meta.variables
  const collections = Object.values(vars.meta.variableCollections)
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
  const tokens: TokenSnapshot = {
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
              if (t) aliases[m.name] = `${vars.meta.variableCollections[t.variableCollectionId]?.name}/${t.name}`
            }
          }
          return { name: v.name, type: v.resolvedType, values, ...(Object.keys(aliases).length ? { aliases } : {}) }
        }),
      }
    }),
  }

  const ids = [...manifest.componentSets.map((s) => s.id), manifest.iconSet.id].join(',')
  const nodes = await figmaGet<{ nodes: Record<string, { document: RestNode }> }>(`/files/${manifest.fileKey}/nodes?ids=${encodeURIComponent(ids)}`)
  const nameOf = (b: { id: string } | { id: string }[] | undefined) => { const f = Array.isArray(b) ? b[0] : b; return f ? (byId[f.id]?.name ?? `lib:${f.id}`) : undefined }
  const describe = (node: RestNode, path: string, out: ComponentsSnapshot['sets'][number]['variants'][number]['nodes']) => {
    const p = path ? `${path}/${node.name}` : node.name
    const bv = node.boundVariables ?? {}
    const b: Record<string, string> = {}
    const r: Record<string, unknown> = {}
    const fill = node.fills?.find((f) => f.visible !== false)
    if (fill) { const n = nameOf(fill.boundVariables?.color); if (n) b.fill = n; else if (fill.type === 'SOLID') r.fill = 'RAW' }
    const stroke = node.strokes?.find((s) => s.visible !== false)
    if (stroke) { const n = nameOf(stroke.boundVariables?.color); if (n) b.stroke = n; else r.stroke = 'RAW'; const w = nameOf(bv.strokeWeight); if (w) b.strokeWeight = w; else if (node.strokeWeight) r.strokeWeight = node.strokeWeight }
    if (node.cornerRadius) { const n = nameOf(bv.topLeftRadius); if (n) b.radius = n; else r.radius = node.cornerRadius }
    if (node.layoutMode && node.layoutMode !== 'NONE') {
      r.layout = [node.layoutMode, node.primaryAxisAlignItems, node.counterAxisAlignItems, node.layoutSizingHorizontal, node.layoutSizingVertical].join(' ')
      for (const k of ['itemSpacing', 'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom'] as const) { const n = nameOf(bv[k]); if (n) b[k] = n; else if (node[k]) r[k] = node[k] }
    }
    for (const k of ['width', 'height'] as const) { const n = nameOf(bv[k]); if (n) b[k] = n }
    if (node.type !== 'TEXT' && node.absoluteBoundingBox) r.size = [Math.round(node.absoluteBoundingBox.width), Math.round(node.absoluteBoundingBox.height)]
    if (node.type === 'TEXT') { r.text = node.characters; for (const k of ['fontSize', 'fontFamily', 'fontWeight', 'lineHeight'] as const) { const n = nameOf(bv[k]); if (n) b[k] = n } }
    if (node.opacity !== undefined && node.opacity !== 1) r.opacity = Math.round(node.opacity * 100) / 100
    if (node.visible === false) r.hidden = true
    const entry: ComponentsSnapshot['sets'][number]['variants'][number]['nodes'][number] = { p, t: node.type, b }
    if (Object.keys(r).length) entry.r = r
    if (node.type === 'INSTANCE') entry.i = node.componentId ?? 'unknown'
    if (node.componentPropertyReferences) entry.pr = Object.fromEntries(Object.entries(node.componentPropertyReferences).map(([k, v]) => [k, v.split('#')[0] ?? v]))
    out.push(entry)
    if (node.children && node.type !== 'INSTANCE') for (const c of node.children) describe(c, p, out)
  }
  const sets: ComponentsSnapshot['sets'] = manifest.componentSets.map((set) => {
    const doc = nodes.nodes[set.id]?.document
    if (!doc) throw new Error(`Node ${set.id} (${set.figma}) not returned by the API`)
    const variantsSource = doc.type === 'COMPONENT_SET' ? (doc.children ?? []).filter((c) => c.type === 'COMPONENT') : [doc]
    const props: ComponentsSnapshot['sets'][number]['props'] = {}
    for (const [k, d] of Object.entries(doc.componentPropertyDefinitions ?? {})) props[k.split('#')[0] ?? k] = { type: d.type, ...(d.variantOptions ? { options: d.variantOptions } : {}), default: d.defaultValue }
    return {
      code: set.code, id: doc.id, name: doc.name, description: doc.description ?? '', props,
      variants: variantsSource.map((v) => { const out: ComponentsSnapshot['sets'][number]['variants'][number]['nodes'] = []; describe(v, '', out); return { id: v.id, name: v.name, props: doc.type === 'COMPONENT_SET' ? parseVariantName(v.name) : {}, nodes: out } }),
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
  return { tokens, components, icons: { fileKey: manifest.fileKey, set: manifest.iconSet, icons, marks: {} } }
}

main().catch((error: unknown) => { console.error(`[figma:pull] ${error instanceof Error ? error.message : String(error)}`); process.exit(1) })
