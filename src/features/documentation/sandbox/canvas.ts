// Runs inside Figma: draws a generated document as a plain white page — a title,
// a line of meta and titled blocks of rows. Neutral in every brand, like the
// white report pages; values are literal because the user's file holds none of
// Bluebird's variables.
import { hexToRgb } from '@shared/figma/color'

export interface DocBlock {
  heading: string
  /** Column titles, drawn as the table's head row. */
  head?: readonly string[]
  /** Each row is its cells; the first cell is the label column. */
  rows: ReadonlyArray<readonly string[]>
  /** Body copy instead of a table: one paragraph per row. */
  prose?: boolean
}

export interface DocPage {
  /** The Figma page the frame goes on; created when the file has none by that name. */
  pageName: string
  /** The frame's name. A frame of the same name on that page is replaced. */
  frameName: string
  title: string
  meta: string
  blocks: readonly DocBlock[]
}

const WIDTH = 1200
const MARGIN = 64
const LABEL_WIDTH = 280
const GAP_BETWEEN_FRAMES = 120
const INK = '#18181B', MUTED = '#52525B', RULE = '#E4E4E7', PAGE = '#FFFFFF', HEAD = '#F4F4F5' // allow-raw: drawn in the user's file, which has none of Bluebird's variables; fixed white page palette
const REGULAR: FontName = { family: 'Inter', style: 'Regular' }
const STRONG: FontName = { family: 'Inter', style: 'Semi Bold' }

const paint = (hex: string): SolidPaint => ({ type: 'SOLID', color: hexToRgb(hex) ?? { r: 0, g: 0, b: 0 } })

function text(characters: string, size: number, font: FontName, color: string): TextNode {
  const node = figma.createText()
  node.fontName = font
  node.fontSize = size
  node.lineHeight = { unit: 'PIXELS', value: Math.round(size * 1.45) }
  node.characters = characters
  node.fills = [paint(color)]
  return node
}

function stack(name: string, direction: 'VERTICAL' | 'HORIZONTAL', gap: number): FrameNode {
  const frame = figma.createFrame()
  frame.name = name
  frame.layoutMode = direction
  frame.itemSpacing = gap
  frame.fills = []
  frame.primaryAxisSizingMode = 'AUTO'
  frame.counterAxisSizingMode = 'AUTO'
  return frame
}

/** Appends `child` and makes it fill the parent's width. */
function fill(parent: FrameNode, child: FrameNode | TextNode): void {
  parent.appendChild(child)
  child.layoutAlign = 'STRETCH'
  if (child.type === 'TEXT') child.textAutoResize = 'HEIGHT'
}

function row(cells: readonly string[], head: boolean): FrameNode {
  const frame = stack('Row', 'HORIZONTAL', 16)
  frame.paddingTop = frame.paddingBottom = 8
  frame.paddingLeft = frame.paddingRight = 12
  if (head) frame.fills = [paint(HEAD)]
  frame.strokes = [paint(RULE)]
  frame.strokeTopWeight = frame.strokeLeftWeight = frame.strokeRightWeight = 0
  frame.strokeBottomWeight = 1
  cells.forEach((cell, i) => {
    const node = text(cell || '—', 14, i === 0 || head ? STRONG : REGULAR, i === 0 || head ? INK : MUTED)
    frame.appendChild(node)
    if (i === 0) { node.resize(LABEL_WIDTH, node.height); node.textAutoResize = 'HEIGHT' } else { node.layoutGrow = 1; node.textAutoResize = 'HEIGHT' }
  })
  return frame
}

async function pageNamed(name: string): Promise<PageNode> {
  const existing = figma.root.children.find((p) => p.name === name)
  if (existing) { await existing.loadAsync(); return existing }
  const created = figma.createPage()
  created.name = name
  return created
}

/** Draws the document and returns its frame's id. */
export async function drawDocument(doc: DocPage): Promise<string> {
  await figma.loadFontAsync(REGULAR)
  await figma.loadFontAsync(STRONG)
  const page = await pageNamed(doc.pageName)
  const previous = page.children.find((n) => n.type === 'FRAME' && n.name === doc.frameName)
  const at = previous ? { x: previous.x, y: previous.y } : { x: page.children.reduce((right, n) => Math.max(right, n.x + n.width + GAP_BETWEEN_FRAMES), 0), y: 0 }
  previous?.remove()

  const root = stack(doc.frameName, 'VERTICAL', 40)
  root.fills = [paint(PAGE)]
  root.paddingTop = root.paddingBottom = root.paddingLeft = root.paddingRight = MARGIN
  root.counterAxisSizingMode = 'FIXED'
  root.resize(WIDTH, root.height)
  page.appendChild(root)
  root.x = at.x
  root.y = at.y

  const header = stack('Header', 'VERTICAL', 8)
  fill(root, header)
  fill(header, text(doc.title, 32, STRONG, INK))
  fill(header, text(doc.meta, 14, REGULAR, MUTED))

  for (const block of doc.blocks) {
    if (!block.rows.length) continue
    const section = stack(block.heading, 'VERTICAL', block.prose ? 8 : 0)
    fill(root, section)
    const heading = text(block.heading, 20, STRONG, INK)
    fill(section, heading)
    if (block.prose) {
      for (const cells of block.rows) fill(section, text(cells.join(' '), 14, REGULAR, MUTED))
    } else {
      if (block.head) fill(section, row(block.head, true))
      for (const cells of block.rows) fill(section, row(cells, false))
    }
  }
  return root.id
}

/** Selects a node and brings it into view, switching page when it lives on another one. */
export async function locate(nodeId: string): Promise<void> {
  const node = await figma.getNodeByIdAsync(nodeId)
  if (!node || node.type === 'DOCUMENT' || node.type === 'PAGE') throw new Error('That layer is no longer in this file.')
  let page: BaseNode | null = node
  while (page && page.type !== 'PAGE') page = page.parent
  if (page && page.type === 'PAGE' && page !== figma.currentPage) await figma.setCurrentPageAsync(page)
  figma.currentPage.selection = [node as SceneNode]
  figma.viewport.scrollAndZoomIntoView([node as SceneNode])
}
