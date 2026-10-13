// Raw Figma REST payloads → the library index. Pure: no fetch, no figma global.
import type { LibraryCollection, LibraryComponent, LibraryStyle, LibraryVariable, ModeValue, VariableType } from './types'

interface RestColor { r: number; g: number; b: number; a?: number }
interface RestAlias { type: 'VARIABLE_ALIAS'; id: string }

export interface RestVariable {
  id: string
  name: string
  key: string
  variableCollectionId: string
  resolvedType: VariableType
  valuesByMode: Record<string, unknown>
  remote?: boolean
  description?: string
  scopes?: string[]
}

export interface RestCollection {
  id: string
  name: string
  modes: { modeId: string; name: string }[]
  defaultModeId: string
  remote?: boolean
}

export interface RestVariablesResponse {
  meta: { variables: Record<string, RestVariable>; variableCollections: Record<string, RestCollection> }
}

interface FrameInfo {
  name?: string
  nodeId?: string
  pageName?: string
  containingComponentSet?: { nodeId: string; name: string } | null
  /** Older name of the same field; the API sends both today. */
  containingStateGroup?: { nodeId: string; name: string } | null
}

export interface RestComponent { key: string; node_id: string; name: string; description?: string; containing_frame?: FrameInfo }
export interface RestComponentsResponse { meta: { components: RestComponent[] } }
export interface RestComponentSetsResponse { meta: { component_sets: RestComponent[] } }

const MAX_ALIAS_DEPTH = 10
/** What an alias into a library this file only imports (or a broken alias) shows instead of a value. */
export const EXTERNAL_VALUE = 'another library'

const isAlias = (v: unknown): v is RestAlias => typeof v === 'object' && v !== null && (v as { type?: string }).type === 'VARIABLE_ALIAS'
const isColor = (v: unknown): v is RestColor => typeof v === 'object' && v !== null && 'r' in v && 'g' in v && 'b' in v

const hex2 = (n: number) => Math.round(Math.min(1, Math.max(0, n)) * 255).toString(16).padStart(2, '0').toUpperCase()

/** #RRGGBB, or #RRGGBBAA when not opaque. */
export function colorHex({ r, g, b, a = 1 }: RestColor): string {
  return `#${hex2(r)}${hex2(g)}${hex2(b)}${a < 1 ? hex2(a) : ''}`
}

function display(value: unknown): string {
  if (isColor(value)) return colorHex(value)
  if (typeof value === 'number') return String(Math.round(value * 100) / 100)
  return String(value)
}

/** Every local variable with each mode's value resolved through aliases inside the file. Remote (imported) variables are left out. */
export function toVariables(res: RestVariablesResponse, fileKey: string): { variables: LibraryVariable[]; collections: LibraryCollection[] } {
  const { variables, variableCollections } = res.meta
  const valueIn = (variable: RestVariable, modeName: string): unknown => {
    const collection = variableCollections[variable.variableCollectionId]
    const mode = collection?.modes.find((m) => m.name === modeName) ?? collection?.modes.find((m) => m.modeId === collection.defaultModeId)
    return mode ? variable.valuesByMode[mode.modeId] : Object.values(variable.valuesByMode)[0]
  }
  const resolve = (value: unknown, modeName: string, depth: number): string => {
    if (value === undefined || value === null) return EXTERNAL_VALUE
    if (!isAlias(value)) return display(value)
    const target = variables[value.id]
    // Imported (remote) variables come back without their values: they live in another library.
    if (!target || target.remote || depth >= MAX_ALIAS_DEPTH) return EXTERNAL_VALUE
    return resolve(valueIn(target, modeName), modeName, depth + 1)
  }

  const local = Object.values(variables).filter((v) => !v.remote)
  const out = local.map((v): LibraryVariable => {
    const collection = variableCollections[v.variableCollectionId]
    const modes = collection?.modes ?? Object.keys(v.valuesByMode).map((modeId) => ({ modeId, name: modeId }))
    const values = modes.map((m): ModeValue => {
      const raw = v.valuesByMode[m.modeId]
      const aliasOf = isAlias(raw) ? variables[raw.id]?.name : undefined
      return { mode: m.name, value: resolve(raw, m.name, 0), ...(aliasOf ? { aliasOf } : {}) }
    })
    return {
      id: v.id, key: v.key, name: v.name, collection: collection?.name ?? '', type: v.resolvedType,
      description: v.description ?? '', scopes: v.scopes ?? [], values, fileKey,
    }
  })
  const collections = Object.values(variableCollections).filter((c) => !c.remote).map((c): LibraryCollection => ({
    name: c.name, modes: c.modes.map((m) => m.name), variables: out.filter((v) => v.collection === c.name).length, fileKey,
  }))
  return { variables: out, collections }
}

const location = (frame?: FrameInfo) => [frame?.pageName, frame?.name].filter(Boolean).join(' › ')

/** Published component sets (with their variants' keys) and the plain components outside any set. */
export function toComponents(components: RestComponentsResponse, sets: RestComponentSetsResponse, fileKey: string): LibraryComponent[] {
  const variantsOf = new Map<string, RestComponent[]>()
  const standalone: RestComponent[] = []
  for (const c of components.meta.components) {
    const setId = (c.containing_frame?.containingComponentSet ?? c.containing_frame?.containingStateGroup)?.nodeId
    if (setId) variantsOf.set(setId, [...(variantsOf.get(setId) ?? []), c])
    else standalone.push(c)
  }
  const fromSets = sets.meta.component_sets.map((s): LibraryComponent => {
    const variants = variantsOf.get(s.node_id) ?? []
    return {
      key: s.key, nodeId: s.node_id, name: s.name, kind: 'set', description: s.description ?? '', location: location(s.containing_frame),
      variants: Math.max(variants.length, 1), keys: [s.key, ...variants.map((v) => v.key)], fileKey,
    }
  })
  const plain = standalone.map((c): LibraryComponent => ({
    key: c.key, nodeId: c.node_id, name: c.name, kind: 'component', description: c.description ?? '', location: location(c.containing_frame),
    variants: 1, keys: [c.key], fileKey,
  }))
  return [...fromSets, ...plain].sort((a, b) => a.name.localeCompare(b.name))
}

export interface RestStyle { key: string; node_id: string; style_type: 'TEXT' | 'FILL' | 'EFFECT' | 'GRID' | string; name: string; description?: string }
export interface RestStylesResponse { meta: { styles: RestStyle[] } }

/** The slice of a TEXT or RECTANGLE node `/files/:key/nodes` returns that a style reads from. */
export interface RestStyleNode {
  document?: {
    type?: string
    style?: { fontFamily?: string; fontPostScriptName?: string | null; fontWeight?: number; fontSize?: number; lineHeightPx?: number; lineHeightUnit?: string; letterSpacing?: number; textCase?: string }
    fills?: { type: string; visible?: boolean; opacity?: number; color?: RestColor }[]
  }
}
export interface RestNodesResponse { nodes: Record<string, RestStyleNode | null> }

/** "Inter-SemiBold" → "Semi Bold"; weight → name when there is no PostScript name. */
export function fontStyleName(postScript: string | null | undefined, weight: number | undefined): string {
  const suffix = postScript?.split('-')[1]
  if (suffix) return suffix.replace(/([a-z])([A-Z])/g, '$1 $2')
  const names: Record<number, string> = { 100: 'Thin', 200: 'Extra Light', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semi Bold', 700: 'Bold', 800: 'Extra Bold', 900: 'Black' }
  return names[weight ?? 400] ?? String(weight ?? '')
}

/** Published TEXT and FILL styles with the values read from their style nodes; other style types are left out. */
export function toStyles(styles: RestStylesResponse, nodes: RestNodesResponse, fileKey: string): LibraryStyle[] {
  const out: LibraryStyle[] = []
  for (const s of styles.meta.styles) {
    const node = nodes.nodes[s.node_id]?.document
    if (s.style_type === 'TEXT') {
      const st = node?.style ?? {}
      out.push({
        kind: 'text', key: s.key, nodeId: s.node_id, name: s.name, description: s.description ?? '', fileKey,
        fontFamily: st.fontFamily ?? '', fontStyle: fontStyleName(st.fontPostScriptName, st.fontWeight), fontWeight: st.fontWeight ?? 400,
        fontSize: st.fontSize ?? 0,
        lineHeight: st.lineHeightUnit === 'INTRINSIC_%' || st.lineHeightPx === undefined ? null : Math.round(st.lineHeightPx * 100) / 100,
        letterSpacing: Math.round((st.letterSpacing ?? 0) * 100) / 100,
        ...(st.textCase && st.textCase !== 'ORIGINAL' ? { textCase: st.textCase } : {}),
      })
    } else if (s.style_type === 'FILL') {
      const solid = (node?.fills ?? []).filter((f) => f.visible !== false).find((f) => f.type === 'SOLID' && f.color)
      out.push({
        kind: 'color', key: s.key, nodeId: s.node_id, name: s.name, description: s.description ?? '', fileKey,
        hex: solid?.color ? colorHex({ ...solid.color, a: (solid.color.a ?? 1) * (solid.opacity ?? 1) }) : null,
      })
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name))
}
