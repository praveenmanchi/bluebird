// Drawing primitives for the documents Bluebird places on the canvas. Runs inside
// Figma. The type ramp and spacing follow the Figma docs/page/* tokens; colours come
// from the UI as hex (the user's file has none of Bluebird's variables).
import { hexToRgb } from '@shared/figma/color'
import type { BadgeTone, CheckType, DocBranding, DocTheme } from '../doc/types'

export type TextSize = 'display' | 'h2' | 'h3' | 'body' | 'small'
export type Weight = 'regular' | 'semibold' | 'bold' | 'mono'

/** docs/page/font/size-* and line-*. */
const TYPE: Readonly<Record<TextSize, readonly [number, number]>> = { display: [32, 40], h2: [20, 28], h3: [16, 24], body: [14, 20], small: [12, 16] }

export const SPACE = { margin: 64, section: 48, block: 24, stack: 16, inset: 12, inline: 8, tight: 4 } as const
export const PAGE_WIDTH = 1200
export const CONTENT_WIDTH = PAGE_WIDTH - SPACE.margin * 2
const RADIUS = 8

type Fonts = Readonly<Record<Weight, FontName>>

/** Noto Sans like the plugin; Inter when the machine lacks it (Inter always loads in Figma). */
const CANDIDATES: Readonly<Record<Weight, readonly FontName[]>> = {
  regular: [{ family: 'Noto Sans', style: 'Regular' }, { family: 'Inter', style: 'Regular' }],
  semibold: [{ family: 'Noto Sans', style: 'SemiBold' }, { family: 'Inter', style: 'Semi Bold' }],
  bold: [{ family: 'Noto Sans', style: 'Bold' }, { family: 'Inter', style: 'Bold' }],
  mono: [{ family: 'JetBrains Mono', style: 'Regular' }, { family: 'Roboto Mono', style: 'Regular' }, { family: 'Inter', style: 'Regular' }],
}

async function firstLoadable(list: readonly FontName[]): Promise<FontName> {
  for (const font of list) {
    try {
      await figma.loadFontAsync(font)
      return font
    } catch {
      // Not installed here; try the next one.
    }
  }
  throw new Error('No usable font found for the report')
}

export function rgb(hex: string): RGB {
  return hexToRgb(hex) ?? { r: 0, g: 0, b: 0 }
}

export const solid = (hex: string, opacity?: number): SolidPaint => ({ type: 'SOLID', color: rgb(hex), ...(opacity === undefined ? {} : { opacity }) })

export interface TextOptions { size?: TextSize; weight?: Weight; color?: string; width?: number; name?: string }

export interface StackOptions {
  name: string
  gap?: number
  padX?: number
  padY?: number
  fill?: string
  stroke?: string
  radius?: boolean
  /** Only these sides of the stroke draw. */
  sides?: { top?: boolean; bottom?: boolean; left?: boolean; right?: boolean }
}

export interface Kit {
  theme: DocTheme
  text(content: string, options?: TextOptions): TextNode
  stack(direction: 'HORIZONTAL' | 'VERTICAL', options: StackOptions): FrameNode
  /** Append and stretch to the parent's width. */
  fill<T extends SceneNode>(parent: FrameNode, child: T): T
  badge(tone: BadgeTone, label: string): FrameNode
  icon(type: CheckType | 'link', color: string, size?: number): FrameNode
  heading(parent: FrameNode, title: string, note?: string): void
}

const ICONS: Readonly<Record<CheckType | 'link', string>> = {
  contrast: '<circle cx="8" cy="8" r="6.25" stroke="C" stroke-width="1.5"/><path d="M8 1.75a6.25 6.25 0 0 1 0 12.5z" fill="C"/>',
  nontext: '<rect x="1.75" y="1.75" width="7" height="7" rx="1" stroke="C" stroke-width="1.5"/><circle cx="10.5" cy="10.5" r="3.75" stroke="C" stroke-width="1.5"/>',
  target: '<rect x="1" y="5" width="14" height="6" rx="1" stroke="C" stroke-width="1.5"/><path d="M4 5v2.5M7 5v3.5M10 5v2.5M13 5v3.5" stroke="C" stroke-width="1.2"/>',
  code: '<path d="M5.5 4 1.75 8l3.75 4M10.5 4l3.75 4-3.75 4" stroke="C" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  link: '<path d="M2.5 8h10M9 4.5 12.5 8 9 11.5" stroke="C" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
}

export async function createKit(theme: DocTheme): Promise<Kit> {
  const fonts: Fonts = {
    regular: await firstLoadable(CANDIDATES.regular),
    semibold: await firstLoadable(CANDIDATES.semibold),
    bold: await firstLoadable(CANDIDATES.bold),
    mono: await firstLoadable(CANDIDATES.mono),
  }

  const text = (content: string, o: TextOptions = {}): TextNode => {
    const t = figma.createText()
    t.fontName = fonts[o.weight ?? 'regular']
    t.characters = content
    const [size, line] = TYPE[o.size ?? 'body']
    t.fontSize = size
    t.lineHeight = { unit: 'PIXELS', value: line }
    t.fills = [solid(o.color ?? theme.body)]
    if (o.name) t.name = o.name
    if (o.width) { t.textAutoResize = 'HEIGHT'; t.resize(o.width, t.height) }
    return t
  }

  const stack = (direction: 'HORIZONTAL' | 'VERTICAL', o: StackOptions): FrameNode => {
    const f = figma.createFrame()
    f.name = o.name
    f.layoutMode = direction
    f.primaryAxisSizingMode = 'AUTO'
    f.counterAxisSizingMode = 'AUTO'
    f.itemSpacing = o.gap ?? 0
    f.paddingLeft = f.paddingRight = o.padX ?? 0
    f.paddingTop = f.paddingBottom = o.padY ?? 0
    f.fills = o.fill ? [solid(o.fill)] : []
    if (o.stroke) {
      f.strokes = [solid(o.stroke)]
      f.strokeAlign = 'INSIDE'
      const s = o.sides
      f.strokeTopWeight = !s || s.top ? 1 : 0
      f.strokeBottomWeight = !s || s.bottom ? 1 : 0
      f.strokeLeftWeight = !s || s.left ? 1 : 0
      f.strokeRightWeight = !s || s.right ? 1 : 0
    }
    if (o.radius) { f.cornerRadius = RADIUS; f.clipsContent = true }
    return f
  }

  const fill = <T extends SceneNode>(parent: FrameNode, child: T): T => {
    parent.appendChild(child)
    if ('layoutSizingHorizontal' in child) (child as unknown as FrameNode).layoutSizingHorizontal = 'FILL'
    return child
  }

  const badge = (tone: BadgeTone, label: string): FrameNode => {
    const colours = theme.severity[tone]
    const b = stack('HORIZONTAL', { name: `Badge · ${label}`, padX: 8, padY: 2, fill: colours.bg })
    b.cornerRadius = 100
    b.appendChild(text(label, { size: 'small', weight: 'semibold', color: colours.fg, name: 'Label' }))
    return b
  }

  const icon = (type: CheckType | 'link', color: string, size = 16): FrameNode => {
    const node = figma.createNodeFromSvg(`<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">${ICONS[type].replace(/="C"/g, `="${color}"`)}</svg>`)
    node.name = `Icon · ${type}`
    node.fills = []
    if (size !== 16) node.rescale(size / 16)
    return node
  }

  const heading = (parent: FrameNode, title: string, note?: string): void => {
    const h = fill(parent, stack('HORIZONTAL', { name: 'Heading', gap: SPACE.inline }))
    h.counterAxisAlignItems = 'BASELINE'
    h.appendChild(text(title, { size: 'h2', weight: 'semibold', color: theme.title, name: 'Title' }))
    if (note) h.appendChild(text(note, { size: 'small', color: theme.meta, name: 'Note' }))
  }

  return { theme, text, stack, fill, badge, icon, heading }
}

/** A white page with the brand bar on top and a padded body; returns the body to fill. */
export function page(kit: Kit, name: string, branding: DocBranding, createdBy: string): { root: FrameNode; body: FrameNode } {
  const { theme } = kit
  const root = kit.stack('VERTICAL', { name, fill: theme.page })
  root.counterAxisSizingMode = 'FIXED'
  root.resize(PAGE_WIDTH, 100)
  root.primaryAxisSizingMode = 'AUTO'

  const bar = kit.fill(root, kit.stack('HORIZONTAL', { name: 'Brand header', padX: SPACE.margin, padY: SPACE.stack, fill: theme.banner.bg }))
  bar.primaryAxisSizingMode = 'FIXED'
  bar.primaryAxisAlignItems = 'SPACE_BETWEEN'
  bar.counterAxisAlignItems = 'CENTER'
  const brand = kit.stack('HORIZONTAL', { name: 'Brand', gap: SPACE.stack })
  brand.counterAxisAlignItems = 'CENTER'
  bar.appendChild(brand)
  const logo = logoNode(theme.logoSvg)
  if (logo) {
    brand.appendChild(logo)
    const divider = figma.createRectangle()
    divider.name = 'Divider'
    divider.resize(1, 32)
    divider.fills = [solid(theme.banner.text, 0.5)]
    brand.appendChild(divider)
  }
  const product = kit.stack('VERTICAL', { name: 'Product' })
  product.appendChild(kit.text('Bluebird', { size: 'h3', weight: 'bold', color: theme.banner.text, name: 'Product' }))
  product.appendChild(kit.text(branding.documentType, { size: 'small', color: theme.banner.text, name: 'Document' }))
  brand.appendChild(product)
  const created = kit.stack('HORIZONTAL', { name: 'Created', gap: SPACE.block })
  bar.appendChild(created)
  for (const [key, value] of [['Created by', createdBy], ['Created', branding.createdAt]] as const) {
    const col = kit.stack('VERTICAL', { name: key })
    col.counterAxisAlignItems = 'MAX'
    col.appendChild(kit.text(key, { size: 'small', color: theme.banner.text, name: 'Key' }))
    col.appendChild(kit.text(value, { size: 'body', weight: 'semibold', color: theme.banner.text, name: 'Value' }))
    created.appendChild(col)
  }

  const body = kit.fill(root, kit.stack('VERTICAL', { name: 'Body', gap: SPACE.section, padX: SPACE.margin, padY: SPACE.margin }))
  return { root, body }
}

/** The brand logo at 32px tall, or null when the UI sent none or Figma rejects the SVG. */
function logoNode(svg: string): FrameNode | null {
  if (!svg) return null
  try {
    const node = figma.createNodeFromSvg(svg)
    node.name = 'Logo'
    if (node.height > 0) node.rescale(32 / node.height)
    return node
  } catch {
    return null
  }
}

export function footer(kit: Kit, body: FrameNode, text: string, branding: DocBranding): void {
  const f = kit.fill(body, kit.stack('VERTICAL', { name: 'Footer', gap: SPACE.tight, padY: SPACE.stack, stroke: kit.theme.border, sides: { top: true } }))
  kit.fill(f, kit.text(text, { size: 'small', color: kit.theme.meta, width: CONTENT_WIDTH, name: 'Text' }))
  kit.fill(f, kit.text(`Document ${branding.documentId} · File: ${branding.file} · Bluebird v${branding.version} · Powered by HCLTech`, { size: 'small', color: kit.theme.meta, width: CONTENT_WIDTH, name: 'Document' }))
}

/** A table with a shaded header row. `cell` draws a body cell; `null` widths share the rest. */
export function table<R>(kit: Kit, parent: FrameNode, name: string, columns: readonly (readonly [string, number | null])[], rows: readonly R[], cell: (row: R, column: number) => SceneNode): FrameNode {
  const { theme } = kit
  const t = kit.fill(parent, kit.stack('VERTICAL', { name, stroke: theme.border, radius: true }))
  const line = (head: boolean, label: string): FrameNode => {
    const r = kit.fill(t, kit.stack('HORIZONTAL', { name: label, padX: SPACE.stack, padY: head ? SPACE.inline : SPACE.inset, gap: SPACE.stack, fill: head ? theme.subtle : undefined, stroke: theme.border, sides: { bottom: true } }))
    r.counterAxisAlignItems = head ? 'CENTER' : 'MIN'
    return r
  }
  const slot = (row: FrameNode, width: number | null, label: string): FrameNode => {
    const c = kit.stack('VERTICAL', { name: label, gap: SPACE.tight })
    row.appendChild(c)
    if (width) { c.resize(width, c.height); c.layoutSizingHorizontal = 'FIXED' } else c.layoutGrow = 1
    return c
  }
  const head = line(true, 'Head')
  for (const [label, width] of columns) {
    const c = slot(head, width, label)
    kit.fill(c, kit.text(label, { size: 'small', weight: 'semibold', color: theme.body }))
  }
  rows.forEach((row, index) => {
    const r = line(false, `Row ${index + 1}`)
    columns.forEach(([label, width], column) => {
      const c = slot(r, width, label)
      const node = cell(row, column)
      c.appendChild(node)
      if (node.type === 'TEXT') { node.layoutSizingHorizontal = 'FILL'; node.textAutoResize = 'HEIGHT' }
    })
  })
  const last = t.children[t.children.length - 1] as FrameNode | undefined
  if (last) last.strokeBottomWeight = 0
  return t
}

/** Beside the scope's bounding box, on the current page, then shown. */
export function place(root: FrameNode, anchors: readonly SceneNode[]): void {
  const boxes = anchors.map((a) => a.absoluteBoundingBox).filter((b): b is Rect => b !== null)
  root.x = boxes.length ? Math.max(...boxes.map((b) => b.x + b.width)) + 160 : figma.viewport.center.x
  root.y = boxes.length ? Math.min(...boxes.map((b) => b.y)) : figma.viewport.center.y
  figma.currentPage.appendChild(root)
  figma.currentPage.selection = [root]
  figma.viewport.scrollAndZoomIntoView([root])
}
