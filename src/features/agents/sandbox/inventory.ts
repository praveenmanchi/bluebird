// What the agents read from the document, as plain data. `collectInventory` runs
// inside Figma; the rule packs in ../rules only ever see this shape, so they are
// unit-testable without the figma global.
import { traverse } from '@shared/figma/traverse'
import { blendOver, contrastRatio, rgbaToHex, type RGB, type RGBA } from '@shared/figma/color'
import { resolveBackground, solidFill, solidFromPaints, solidStroke } from '@shared/figma/paint'
import { RUN_NODE_LIMIT } from '../messages'

/** A solid paint on a layer, with the variable bound to it when the designer bound one. */
export interface PaintInfo {
  hex: string
  rgb: RGB
  alpha: number
  variableId?: string
  variableName?: string
}

/** A numeric layout field: its value and the variable bound to it, if any. */
export interface NumberField { value: number; variableId?: string; variableName?: string }

/** One styled run of a text layer (a bold word, a link): judged on its own colour and size. */
export interface TextRun {
  characters: string
  fontSize: number
  fontWeight: number
  fontStyle: string
  /** The run's colour composited over the layer's backdrop. */
  fill: PaintInfo | null
}

export interface TextInfo {
  id: string
  name: string
  /** "Checkout › Pay button › Label". */
  path: string
  characters: string
  fontFamily: string
  fontSize: number
  fontWeight: number
  width: number
  height: number
  /** Figma textAutoResize: NONE (fixed box), HEIGHT (grows down), WIDTH_AND_HEIGHT (grows both), TRUNCATE (legacy). */
  autoResize: string
  truncates: boolean
  maxLines: number | null
  /** A text style or a font variable governs the typography. */
  styled: boolean
  /** Inside a component instance (its text is the component's, overridden or not). */
  inInstance: boolean
  /** What the text is for, from its layer and ancestor names: button label, error message, heading, body… */
  role: TextRole
  runs: readonly TextRun[]
  /** The composited backdrop, or null when it sits on an image/gradient (unmeasurable). */
  backdrop: { rgb: RGB; hex: string; variableId?: string; variableName?: string; assumed: boolean } | null
  backdropReason?: string
  /** Opacity of the layer times every ancestor's. */
  opacity: number
}

export type TextRole = 'button' | 'link' | 'heading' | 'label' | 'error' | 'helper' | 'placeholder' | 'body'

export interface NodeInfo {
  id: string
  name: string
  type: string
  path: string
  width: number
  height: number
  fills: readonly PaintInfo[]
  stroke: PaintInfo | null
  strokeWeight: number
  hasImageFill: boolean
  /** Auto layout fields (only when the frame has auto layout). */
  layout?: { itemSpacing: NumberField; paddingLeft: NumberField; paddingRight: NumberField; paddingTop: NumberField; paddingBottom: NumberField }
  cornerRadius?: NumberField
  isInstance: boolean
  /** The main component (set) name for an instance, with whether it comes from a library. */
  mainName?: string
  mainRemote?: boolean
  /** Figma's own flag: this frame used to be an instance. */
  detachedFrom?: string
  /** Prototype interactions make it a tap target. */
  interactive: boolean
  /** Backdrop for non-text contrast; null when unmeasurable or assumed. */
  backdrop: { rgb: RGB; hex: string } | null
  /** Inside a nested component instance (not the designer's own layer). */
  inInstance: boolean
  childrenCount: number
}

export interface Inventory {
  pageName: string
  fileName: string
  scopeName: string
  frames: number
  texts: readonly TextInfo[]
  nodes: readonly NodeInfo[]
  /** The walk stopped at RUN_NODE_LIMIT. */
  truncated: boolean
  layers: number
}

const ROLE_RULES: readonly [TextRole, RegExp][] = [
  ['error', /\b(error|invalid|warning|alert|danger)\b/i],
  ['button', /\b(button|btn|cta|primary action|secondary action)\b/i],
  ['link', /\b(link|anchor)\b/i],
  ['heading', /\b(heading|headline|title|h[1-6]|display)\b/i],
  ['helper', /\b(helper|hint|assistive|supporting|description)\b/i],
  ['placeholder', /\bplaceholder\b/i],
  ['label', /\b(label|caption|tag|badge|chip|eyebrow|overline)\b/i],
]

/** The role a text plays, from its own name first, then its ancestors' (a "Label" inside "Button" is a button label). */
export function roleFor(names: readonly string[], fontSize: number): TextRole {
  for (const [role, re] of ROLE_RULES) if (re.test(names[0] ?? '')) return role === 'label' && names.slice(1).some((n) => /\b(button|btn|cta)\b/i.test(n)) ? 'button' : role
  for (const name of names.slice(1)) for (const [role, re] of ROLE_RULES) if (re.test(name)) return role
  return fontSize >= 20 ? 'heading' : 'body'
}

export const pathOf = (node: BaseNode): string => {
  const names: string[] = []
  let cur: BaseNode | null = node
  while (cur && cur.type !== 'PAGE' && cur.type !== 'DOCUMENT') { names.unshift(cur.name); cur = cur.parent }
  return names.slice(-3).join(' › ')
}

const ancestorNames = (node: BaseNode): string[] => {
  const names: string[] = []
  let cur: BaseNode | null = node
  while (cur && cur.type !== 'PAGE' && cur.type !== 'DOCUMENT') { names.push(cur.name); cur = cur.parent }
  return names
}

const inInstance = (node: BaseNode): boolean => {
  let cur: BaseNode | null = node.parent
  while (cur && cur.type !== 'PAGE' && cur.type !== 'DOCUMENT') { if (cur.type === 'INSTANCE') return true; cur = cur.parent }
  return false
}

const effectiveOpacity = (node: SceneNode): number => {
  let o = 'opacity' in node ? node.opacity : 1
  let cur: BaseNode | null = node.parent
  while (cur && cur.type !== 'PAGE' && cur.type !== 'DOCUMENT') { if ('opacity' in cur && typeof cur.opacity === 'number') o *= cur.opacity; cur = cur.parent }
  return o
}

async function variableName(id: string | undefined, cache: Map<string, string | null>): Promise<string | undefined> {
  if (!id) return undefined
  if (!cache.has(id)) {
    try { cache.set(id, (await figma.variables.getVariableByIdAsync(id))?.name ?? null) } catch { cache.set(id, null) }
  }
  return cache.get(id) ?? undefined
}

function aliasId(value: unknown): string | undefined {
  if (Array.isArray(value)) return aliasId(value[0])
  return typeof value === 'object' && value !== null && (value as { type?: string }).type === 'VARIABLE_ALIAS' ? (value as VariableAlias).id : undefined
}

async function paintInfo(rgba: RGBA, backdrop: RGB | null, variableId: string | undefined, names: Map<string, string | null>): Promise<PaintInfo> {
  const rgb = backdrop ? blendOver(rgba, backdrop) : { r: rgba.r, g: rgba.g, b: rgba.b }
  return { hex: rgbaToHex(rgb), rgb, alpha: rgba.a, ...(variableId ? { variableId, variableName: await variableName(variableId, names) } : {}) }
}

async function numberField(node: SceneNode, field: string, value: number, names: Map<string, string | null>): Promise<NumberField> {
  const bound = 'boundVariables' in node ? (node.boundVariables as Record<string, unknown> | undefined)?.[field] : undefined
  const id = aliasId(bound)
  return { value, ...(id ? { variableId: id, variableName: await variableName(id, names) } : {}) }
}

function runsOf(node: TextNode, backdrop: RGB | null, opacity: number): { characters: string; fontSize: number; fontWeight: number; fontStyle: string; fill: RGBA | null; variableId?: string }[] {
  if (typeof node.getStyledTextSegments === 'function') {
    try {
      const segments = node.getStyledTextSegments(['fills', 'fontSize', 'fontName', 'fontWeight', 'boundVariables'])
      if (segments.length) {
        return segments.map((seg) => ({
          characters: seg.characters,
          fontSize: seg.fontSize,
          fontWeight: seg.fontWeight,
          fontStyle: seg.fontName.style,
          fill: solidFromPaints(seg.fills, opacity),
          variableId: (seg.boundVariables as { fills?: readonly VariableAlias[] } | undefined)?.fills?.[0]?.id,
        }))
      }
    } catch {
      // Fall through to the whole node.
    }
  }
  const fontName = node.fontName !== figma.mixed ? node.fontName : null
  return [{
    characters: node.characters,
    fontSize: typeof node.fontSize === 'number' ? node.fontSize : 0,
    fontWeight: typeof node.fontWeight === 'number' ? node.fontWeight : 400,
    fontStyle: fontName?.style ?? '',
    fill: solidFill(node),
    variableId: aliasId(node.boundVariables?.fills),
  }]
  void backdrop
}

/** Reads the scope. `onProgress` is called with layers visited; return false to stop early. */
export async function collectInventory(roots: readonly SceneNode[], scopeName: string, onProgress?: (visited: number) => boolean | void): Promise<Inventory> {
  const names = new Map<string, string | null>()
  const texts: TextInfo[] = []
  const nodes: NodeInfo[] = []
  const pending: SceneNode[] = []
  let truncated = false
  figma.skipInvisibleInstanceChildren = true
  const layers = await traverse(roots, (node) => {
    if (!node.visible) return
    if (pending.length >= RUN_NODE_LIMIT) { truncated = true; return }
    pending.push(node)
  }, {
    batchSize: 300,
    skipChildren: (node) => !node.visible || pending.length >= RUN_NODE_LIMIT,
    onProgress: (visited) => (onProgress?.(visited) === false ? false : undefined),
  })

  let frames = 0
  for (const node of pending) {
    const chain = ancestorNames(node)
    const nested = inInstance(node)
    const opacity = effectiveOpacity(node)
    if (node.type === 'TEXT') {
      if (!node.characters.trim()) continue
      const back = resolveBackground(node)
      const backdrop = back.indeterminate ? null : back.color
      const runs: TextRun[] = []
      for (const run of runsOf(node, backdrop, opacity)) {
        if (!run.characters.trim()) continue
        const fill = run.fill && backdrop ? await paintInfo({ ...run.fill, a: run.fill.a * back.foregroundOpacity }, backdrop, run.variableId, names) : run.fill ? await paintInfo(run.fill, null, run.variableId, names) : null
        runs.push({ characters: run.characters, fontSize: run.fontSize, fontWeight: run.fontWeight, fontStyle: run.fontStyle, fill })
      }
      const fontName = node.fontName !== figma.mixed ? node.fontName : null
      const fontSize = typeof node.fontSize === 'number' ? node.fontSize : (runs[0]?.fontSize ?? 0)
      const textStyle = typeof node.textStyleId === 'string' && node.textStyleId !== ''
      const fontVariables = Boolean(node.boundVariables && Object.keys(node.boundVariables).some((k) => /^font|^lineHeight|^letterSpacing/.test(k)))
      texts.push({
        id: node.id, name: node.name, path: pathOf(node), characters: node.characters,
        fontFamily: fontName?.family ?? '', fontSize, fontWeight: typeof node.fontWeight === 'number' ? node.fontWeight : (runs[0]?.fontWeight ?? 400),
        width: node.width, height: node.height, autoResize: node.textAutoResize,
        truncates: node.textTruncation === 'ENDING' || node.textAutoResize === 'TRUNCATE', maxLines: node.maxLines ?? null,
        styled: textStyle || fontVariables, inInstance: nested, role: roleFor(chain, fontSize), runs,
        backdrop: backdrop ? { rgb: backdrop, hex: rgbaToHex(backdrop), assumed: back.assumed, ...(back.variableId ? { variableId: back.variableId, variableName: await variableName(back.variableId, names) } : {}) } : null,
        ...(back.indeterminate ? { backdropReason: back.reason } : {}),
        opacity,
      })
      continue
    }
    if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE' || node.type === 'SECTION' || node.type === 'COMPONENT_SET') {
      if (node.parent?.type === 'PAGE' || node.parent?.type === 'SECTION') frames += 1
    }
    const fills: PaintInfo[] = []
    let hasImage = false
    if ('fills' in node && node.fills !== figma.mixed) {
      const paints = node.fills
      for (let i = 0; i < paints.length; i += 1) {
        const paint = paints[i]!
        if (paint.visible === false) continue
        if (paint.type === 'IMAGE' || paint.type === 'VIDEO') { hasImage = true; continue }
        if (paint.type !== 'SOLID') continue
        const bound = Array.isArray(node.boundVariables?.fills) ? node.boundVariables.fills[i]?.id : undefined
        fills.push(await paintInfo({ ...paint.color, a: paint.opacity ?? 1 }, null, bound, names))
      }
    }
    const strokeRgba = solidStroke(node)
    const strokeBound = 'boundVariables' in node && Array.isArray(node.boundVariables?.strokes) ? node.boundVariables.strokes[0]?.id : undefined
    const back = (strokeRgba || fills.length) ? resolveBackground(node) : null
    const backdrop = back && !back.indeterminate && !back.assumed ? { rgb: back.color, hex: rgbaToHex(back.color) } : null
    const stroke = strokeRgba ? await paintInfo(strokeRgba, backdrop?.rgb ?? null, strokeBound, names) : null
    const auto = 'layoutMode' in node && node.layoutMode !== 'NONE'
    const layout = auto ? {
      itemSpacing: await numberField(node, 'itemSpacing', node.itemSpacing, names),
      paddingLeft: await numberField(node, 'paddingLeft', node.paddingLeft, names),
      paddingRight: await numberField(node, 'paddingRight', node.paddingRight, names),
      paddingTop: await numberField(node, 'paddingTop', node.paddingTop, names),
      paddingBottom: await numberField(node, 'paddingBottom', node.paddingBottom, names),
    } : undefined
    const radius = 'cornerRadius' in node && typeof node.cornerRadius === 'number' ? await numberField(node, 'cornerRadius', node.cornerRadius, names) : undefined
    let mainName: string | undefined
    let mainRemote: boolean | undefined
    if (node.type === 'INSTANCE') {
      try {
        const main = await node.getMainComponentAsync()
        if (main) { mainName = main.parent?.type === 'COMPONENT_SET' ? main.parent.name : main.name; mainRemote = main.remote }
      } catch { /* a library that isn't loaded */ }
    }
    const detached = node.type === 'FRAME' && node.detachedInfo ? (node.detachedInfo.type === 'library' ? `library component ${node.detachedInfo.componentKey.slice(0, 8)}…` : 'a local component') : undefined
    nodes.push({
      id: node.id, name: node.name, type: node.type, path: pathOf(node), width: node.width, height: node.height,
      fills, stroke, strokeWeight: 'strokeWeight' in node && typeof node.strokeWeight === 'number' ? node.strokeWeight : 0, hasImageFill: hasImage,
      ...(layout ? { layout } : {}), ...(radius ? { cornerRadius: radius } : {}),
      isInstance: node.type === 'INSTANCE', ...(mainName ? { mainName, mainRemote } : {}), ...(detached ? { detachedFrom: detached } : {}),
      interactive: 'reactions' in node && Array.isArray(node.reactions) && node.reactions.length > 0,
      backdrop, inInstance: nested, childrenCount: 'children' in node ? node.children.length : 0,
    })
  }
  return { pageName: figma.currentPage.name, fileName: figma.root.name, scopeName, frames, texts, nodes, truncated, layers }
}

/** Contrast of a paint over a backdrop (both already composited). */
export const ratioOf = (fg: RGB, bg: RGB): number => Math.round(contrastRatio(fg, bg) * 100) / 100
