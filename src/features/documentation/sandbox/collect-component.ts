// Runs inside Figma: reads everything a component doc is built from — properties,
// the default variant's layers, the variables bound on them and how those resolve
// per brand mode.
import { contrastRatio, rgbaToHex } from '@shared/figma/color'
import { codeSnippet } from '../model'
import type { AnatomyPart, BrandDiff, ComponentKind, ComponentSummary, DocCheck, DocProperty, DocToken } from '../types'

export interface RawComponent {
  summary: ComponentSummary
  anatomy: AnatomyPart[]
  properties: DocProperty[]
  tokens: DocToken[]
  brandDiff: BrandDiff | null
  checks: DocCheck[]
  code: string
}

const MAX_PARTS = 6
const MAX_DEPTH = 10
const PREVIEW_WIDTH = 480

/** boundVariables key → the role the doc names it by. */
const ROLE: Readonly<Record<string, string>> = {
  fills: 'Fill', strokes: 'Stroke', itemSpacing: 'Gap', counterAxisSpacing: 'Wrap gap', paddingLeft: 'Padding x', paddingRight: 'Padding x',
  paddingTop: 'Padding y', paddingBottom: 'Padding y', topLeftRadius: 'Corner radius', topRightRadius: 'Corner radius', bottomLeftRadius: 'Corner radius',
  bottomRightRadius: 'Corner radius', width: 'Width', height: 'Height', minWidth: 'Min width', minHeight: 'Min height', strokeWeight: 'Stroke width',
  fontSize: 'Font size', lineHeight: 'Line height', fontWeight: 'Font weight', fontFamily: 'Font family', opacity: 'Opacity',
}

type Alias = { type: 'VARIABLE_ALIAS'; id: string }
const isAlias = (v: unknown): v is Alias => typeof v === 'object' && v !== null && (v as Alias).type === 'VARIABLE_ALIAS'
const isColor = (v: unknown): v is RGBA => typeof v === 'object' && v !== null && 'r' in v && 'g' in v && 'b' in v

async function target(node: SceneNode): Promise<{ root: ComponentNode | ComponentSetNode; variant: ComponentNode; kind: ComponentKind } | null> {
  const main = node.type === 'INSTANCE' ? await node.getMainComponentAsync() : node
  if (!main) return null
  if (main.type === 'COMPONENT_SET') return { root: main, variant: main.defaultVariant ?? (main.children[0] as ComponentNode), kind: 'Component set' }
  if (main.type !== 'COMPONENT') return null
  if (main.parent?.type === 'COMPONENT_SET') return { root: main.parent, variant: main, kind: node.type === 'INSTANCE' ? 'Component set' : 'Variant' }
  return { root: main, variant: main, kind: 'Component' }
}

function readProperties(root: ComponentNode | ComponentSetNode): DocProperty[] {
  return Object.entries(root.componentPropertyDefinitions).map(([key, def]) => {
    const name = key.split('#')[0]!
    if (def.type === 'VARIANT') return { name, value: (def.variantOptions ?? []).join(' · ') }
    if (def.type === 'BOOLEAN') return { name, value: `Boolean · ${def.defaultValue ? 'on' : 'off'} by default` }
    if (def.type === 'TEXT') return { name, value: `Text · “${String(def.defaultValue)}”` }
    return { name, value: 'Instance swap' }
  })
}

interface Resolved { alias: string | null; value: unknown }

/** Follows an alias chain. `brandMode` applies to variables of `brandCollection`; every other collection uses its default mode. */
async function resolve(variable: Variable, collections: Map<string, VariableCollection | null>, brandCollection?: string, brandMode?: string): Promise<Resolved> {
  let current: Variable | null = variable
  let alias: string | null = null
  for (let depth = 0; current && depth < MAX_DEPTH; depth += 1) {
    const cid: string = current.variableCollectionId
    if (!collections.has(cid)) collections.set(cid, await figma.variables.getVariableCollectionByIdAsync(cid))
    const collection = collections.get(cid)
    const mode: string | undefined = cid === brandCollection && brandMode ? brandMode : collection?.defaultModeId
    const value: unknown = mode ? current.valuesByMode[mode] : undefined
    if (!isAlias(value)) return { alias, value }
    current = await figma.variables.getVariableByIdAsync(value.id)
    if (alias === null && current) alias = current.name
  }
  return { alias, value: undefined }
}

const show = (value: unknown): string => isColor(value) ? rgbaToHex(value).toUpperCase() : typeof value === 'number' ? String(Math.round(value * 100) / 100) : typeof value === 'string' ? value : '—'

interface Bound { variable: Variable; role: string; layer: string }

/** Every variable bound on the variant's own layers (not inside nested instances). */
async function boundVariables(variant: ComponentNode): Promise<{ bound: Bound[]; nested: number; raw: number }> {
  const bound: Bound[] = []
  const seen = new Set<string>()
  let nested = 0, raw = 0
  const walk = async (node: SceneNode, inInstance: boolean): Promise<void> => {
    if (node.type === 'INSTANCE') nested += 1
    if (!inInstance) {
      const vars = (node.boundVariables ?? {}) as Record<string, Alias | Alias[] | undefined>
      for (const [key, ref] of Object.entries(vars)) {
        if (!ROLE[key] && key !== 'textRangeFills') continue
        for (const alias of Array.isArray(ref) ? ref : ref ? [ref] : []) {
          if (!isAlias(alias)) continue
          const variable = await figma.variables.getVariableByIdAsync(alias.id)
          const role = node.type === 'TEXT' && key === 'fills' ? 'Text' : ROLE[key] ?? 'Text'
          const id = `${variable?.id}|${role}`
          if (!variable || seen.has(id)) continue
          seen.add(id)
          bound.push({ variable, role, layer: node === variant ? 'Container' : node.name })
        }
      }
      if ('fills' in node && Array.isArray(node.fills) && node.fills.some((p: Paint) => p.type === 'SOLID' && p.visible !== false) && !vars.fills && !('fillStyleId' in node && node.fillStyleId)) raw += 1
    }
    if ('children' in node) for (const child of node.children) await walk(child, inInstance || node.type === 'INSTANCE')
  }
  await walk(variant, false)
  return { bound, nested, raw }
}

/** The collection the brand modes live in: the one with the most modes among those the tokens pass through. */
async function brandCollection(bound: readonly Bound[], collections: Map<string, VariableCollection | null>): Promise<VariableCollection | null> {
  let best: VariableCollection | null = null
  for (const { variable } of bound) {
    let current: Variable | null = variable
    for (let depth = 0; current && depth < MAX_DEPTH; depth += 1) {
      const cid: string = current.variableCollectionId
      if (!collections.has(cid)) collections.set(cid, await figma.variables.getVariableCollectionByIdAsync(cid))
      const collection = collections.get(cid)
      if (collection && collection.modes.length > (best?.modes.length ?? 1)) best = collection
      const value: unknown = collection ? current.valuesByMode[collection.defaultModeId] : undefined
      current = isAlias(value) ? await figma.variables.getVariableByIdAsync(value.id) : null
    }
  }
  return best
}

function anatomy(variant: ComponentNode): AnatomyPart[] {
  const w = variant.width || 1, h = variant.height || 1
  const parts: AnatomyPart[] = [{ n: 1, name: 'Container', detail: variant.layoutMode === 'NONE' ? 'Frame' : `Auto layout, ${variant.layoutMode === 'HORIZONTAL' ? 'row' : 'column'}`, x: 0, y: 0 }]
  for (const child of variant.children.slice(0, MAX_PARTS - 1)) {
    const { characters, mainComponent: swap } = child.componentPropertyReferences ?? {}
    const detail = child.type === 'TEXT' ? (characters ? `Text property “${characters.split('#')[0]}”` : 'Text')
      : child.type === 'INSTANCE' ? (swap ? `Instance swap “${swap.split('#')[0]}”` : 'Nested component')
        : child.type.charAt(0) + child.type.slice(1).toLowerCase().replace(/_/g, ' ')
    parts.push({
      n: parts.length + 1, name: child.name, detail: `${detail}${child.visible ? '' : ', off by default'}`,
      x: Math.min(1, Math.max(0, (child.x + child.width / 2) / w)), y: Math.min(1, Math.max(0, child.y / h)),
    })
  }
  return parts
}

async function preview(variant: ComponentNode): Promise<string | null> {
  try {
    const bytes = await variant.exportAsync({ format: 'PNG', constraint: { type: 'WIDTH', value: Math.min(PREVIEW_WIDTH, Math.max(1, Math.round(variant.width * 2))) } })
    return `data:image/png;base64,${figma.base64Encode(bytes)}`
  } catch {
    // A component that cannot be exported (zero size, missing font) still gets its doc; only the picture is missing.
    return null
  }
}

function firstText(node: SceneNode): TextNode | null {
  if (node.type === 'TEXT' && node.visible) return node
  if ('children' in node) for (const child of node.children) { const found = firstText(child); if (found) return found }
  return null
}

const solid = (node: SceneNode): RGB | null => {
  const paint = 'fills' in node && Array.isArray(node.fills) ? (node.fills as Paint[]).find((p) => p.type === 'SOLID' && p.visible !== false) : undefined
  return paint && paint.type === 'SOLID' ? paint.color : null
}

function checks(variant: ComponentNode): DocCheck[] {
  const out: DocCheck[] = []
  const text = firstText(variant)
  const fg = text ? solid(text) : null, bg = solid(variant)
  if (text && fg && bg) {
    const ratio = Math.round(contrastRatio(fg, bg) * 10) / 10
    const large = typeof text.fontSize === 'number' && text.fontSize >= 24
    const need = large ? 3 : 4.5
    out.push({ status: ratio >= need ? 'pass' : 'fail', title: `Contrast 1.4.3 · ${ratio >= need ? 'passes' : 'fails'} at ${ratio}:1`, detail: `${text.name} ${rgbaToHex(fg).toUpperCase()} on ${rgbaToHex(bg).toUpperCase()} · needs ${need}:1 · measured in the current brand mode` })
  }
  const size = Math.round(Math.min(variant.width, variant.height))
  out.push(size >= 44 ? { status: 'pass', title: 'Target size 2.5.8', detail: `${size} px on its short side · passes AA 24 px and AAA 44 px` }
    : size >= 24 ? { status: 'warning', title: 'Target size 2.5.8', detail: `${size} px on its short side · passes AA 24 px, below 44 px for 2.5.5` }
      : { status: 'fail', title: 'Target size 2.5.8', detail: `${size} px on its short side · below the AA minimum of 24 px` })
  return out
}

/** Reads the component behind `node`; null when the node is not a component, a variant, a set or an instance of one. */
export async function collectComponent(node: SceneNode, withPreview: boolean): Promise<RawComponent | null> {
  const found = await target(node)
  if (!found) return null
  const { root, variant, kind } = found
  const collections = new Map<string, VariableCollection | null>()
  const { bound, nested, raw } = await boundVariables(variant)
  const brand = await brandCollection(bound, collections)

  const tokens: DocToken[] = []
  let brandDiff: BrandDiff | null = null
  for (const { variable, role, layer } of bound) {
    const resolved = await resolve(variable, collections)
    tokens.push({ name: variable.name, kind: variable.resolvedType === 'COLOR' ? 'color' : 'number', role, layer, alias: resolved.alias, value: show(resolved.value) })
    if (brand && !brandDiff && variable.resolvedType === 'COLOR') {
      const values: Array<{ brand: string; value: string }> = []
      for (const mode of brand.modes) values.push({ brand: mode.name, value: show((await resolve(variable, collections, brand.id, mode.modeId)).value) })
      if (new Set(values.map((v) => v.value)).size > 1) brandDiff = { token: variable.name, values }
    }
  }

  const properties = readProperties(root)
  const label = firstText(variant)?.characters ?? null
  return {
    summary: {
      nodeId: root.id, name: root.name, kind, variants: root.type === 'COMPONENT_SET' ? root.children.length : 1,
      properties: properties.map((p) => p.name), tokens: tokens.length, nested, rawValues: raw, brands: brand ? brand.modes.map((m) => m.name) : [],
      preview: withPreview ? await preview(variant) : null,
    },
    anatomy: anatomy(variant), properties, tokens, brandDiff, checks: checks(variant),
    code: codeSnippet(root.name, variant.variantProperties ?? {}, label),
  }
}
