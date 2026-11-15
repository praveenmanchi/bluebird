// Runs inside Figma: Add to Figma draws the Variable search report as a plain white
// page on the current page (Figma "Variable search report · /default"). The values are
// literal because the user's file holds none of Bluebird's variables; they mirror the
// report/* tokens (report/surface/page, report/text/title, …), so the page is the same
// in every brand.
import { hexToRgb } from '@shared/figma/color'
import type { ReportResult, ReportRow, ReportSection, SearchReport } from '../report'

const WIDTH = 1200
const MARGIN = 64
const GAP_BETWEEN_FRAMES = 200
const PAGE = '#FFFFFF', SUBTLE = '#F7F7F7', RULE = '#DEDEDE', TITLE = '#161616', BODY = '#4D4D4D', META = '#757575', LINK = '#0B57D0' // allow-raw: drawn in the user's file, which has none of Bluebird's variables; mirrors report/* tokens
const REGULAR: FontName = { family: 'Inter', style: 'Regular' }
const STRONG: FontName = { family: 'Inter', style: 'Semi Bold' }
const BOLD: FontName = { family: 'Inter', style: 'Bold' }
/** Table columns: #, Place, Kind, Page, Nodes, then the link fills the rest. */
const COLUMNS = [48, 320, 160, 220, 160] as const

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

function cell(parent: FrameNode, node: TextNode, width?: number): void {
  parent.appendChild(node)
  if (width) { node.resize(width, node.height); node.textAutoResize = 'HEIGHT' } else { node.layoutGrow = 1; node.textAutoResize = 'HEIGHT' }
}

function rule(frame: FrameNode, sides: 'bottom' | 'top-bottom' | 'top'): void {
  frame.strokes = [paint(RULE)]
  frame.strokeLeftWeight = frame.strokeRightWeight = 0
  frame.strokeTopWeight = sides === 'bottom' ? 0 : 1
  frame.strokeBottomWeight = sides === 'top' ? 0 : 1
}

function header(stamp: string): FrameNode {
  const band = stack('Header', 'HORIZONTAL', 16)
  band.fills = [paint(SUBTLE)]
  band.paddingTop = band.paddingBottom = 20
  band.paddingLeft = band.paddingRight = MARGIN
  band.counterAxisAlignItems = 'CENTER'
  cell(band, text('Bluebird · Variable search report', 14, STRONG, TITLE))
  const right = text(`Last updated ${stamp}`, 12, REGULAR, META)
  band.appendChild(right)
  rule(band, 'bottom')
  return band
}

function details(report: SearchReport): FrameNode {
  const row = stack('Details', 'HORIZONTAL', 24)
  row.paddingTop = row.paddingBottom = 16
  rule(row, 'top-bottom')
  for (const [key, value] of report.details) {
    const pair = stack(key, 'VERTICAL', 4)
    row.appendChild(pair)
    pair.layoutGrow = 1
    fill(pair, text(key, 12, REGULAR, META))
    fill(pair, text(value, 14, STRONG, TITLE))
  }
  return row
}

function totals(report: SearchReport): FrameNode {
  const row = stack('Totals', 'HORIZONTAL', 16)
  for (const t of report.totals) {
    const card = stack(`Total · ${t.label}`, 'VERTICAL', 4)
    row.appendChild(card)
    card.layoutGrow = 1
    card.paddingTop = card.paddingBottom = card.paddingLeft = card.paddingRight = 20
    card.cornerRadius = 12
    card.strokes = [paint(RULE)]
    card.strokeWeight = 1
    fill(card, text(t.value, 32, BOLD, TITLE))
    fill(card, text(t.label, 14, STRONG, TITLE))
    fill(card, text(t.note, 12, REGULAR, META))
  }
  return row
}

function tableRow(cells: readonly string[], head: boolean, link?: { nodeId: string } | null): FrameNode {
  const frame = stack(head ? 'Head' : `Row · ${cells[1]}`, 'HORIZONTAL', 16)
  frame.paddingTop = frame.paddingBottom = head ? 10 : 12
  frame.paddingLeft = frame.paddingRight = 16
  frame.counterAxisAlignItems = 'CENTER'
  if (head) frame.fills = [paint(SUBTLE)]
  rule(frame, 'bottom')
  cells.forEach((value, i) => cell(frame, text(value, head ? 12 : 14, head ? STRONG : REGULAR, head || i === 1 ? TITLE : BODY), COLUMNS[i]))
  if (head) cell(frame, text('Go to', 12, STRONG, TITLE))
  else if (link) {
    const open = text('Open', 14, REGULAR, LINK)
    open.textDecoration = 'UNDERLINE'
    open.hyperlink = { type: 'NODE', value: link.nodeId }
    cell(frame, open)
  } else cell(frame, text('Not on the canvas', 14, REGULAR, META))
  return frame
}

function sectionBlock(s: ReportSection): FrameNode {
  const block = stack(`Variable · ${s.name}`, 'VERTICAL', 12)
  const heading = stack('Heading', 'HORIZONTAL', 12)
  heading.counterAxisAlignItems = 'BASELINE'
  fill(block, heading)
  heading.appendChild(text(s.name, 20, STRONG, TITLE))
  cell(heading, text(s.meta, 12, REGULAR, META))
  const table = stack('Table', 'VERTICAL', 0)
  table.cornerRadius = 12
  table.clipsContent = true
  table.strokes = [paint(RULE)]
  table.strokeWeight = 1
  fill(block, table)
  fill(table, tableRow(['#', 'Place', 'Kind', 'Page', 'Nodes using it'], true))
  s.rows.forEach((r: ReportRow, i) => fill(table, tableRow([String(i + 1), r.name, r.kind, r.page, `${r.nodes} node${r.nodes === 1 ? '' : 's'}`], false, r.nodeId ? { nodeId: r.nodeId } : null)))
  return block
}

/** Draws the report next to the page's content (or in place of an earlier one with the same name) and shows it. */
export async function drawReport(report: SearchReport): Promise<ReportResult> {
  await Promise.all([REGULAR, STRONG, BOLD].map((f) => figma.loadFontAsync(f)))
  const page = figma.currentPage
  const previous = page.children.find((n) => n.type === 'FRAME' && n.name === report.frameName)
  const at = previous
    ? { x: previous.x, y: previous.y }
    : { x: page.children.reduce((right, n) => Math.max(right, n.x + n.width + GAP_BETWEEN_FRAMES), 0), y: page.children.reduce((top, n) => Math.min(top, n.y), 0) }
  previous?.remove()

  const root = stack(report.frameName, 'VERTICAL', 0)
  root.fills = [paint(PAGE)]
  root.counterAxisSizingMode = 'FIXED'
  root.resize(WIDTH, root.height)
  page.appendChild(root)
  root.x = at.x
  root.y = at.y

  const stamp = report.details.find(([k]) => k === 'Last updated')?.[1] ?? ''
  fill(root, header(stamp))
  const body = stack('Body', 'VERTICAL', 40)
  body.paddingTop = body.paddingBottom = body.paddingLeft = body.paddingRight = MARGIN
  fill(root, body)
  fill(body, text(report.title, 32, BOLD, TITLE))
  fill(body, details(report))
  fill(body, totals(report))
  for (const s of report.sections) fill(body, sectionBlock(s))
  const footer = stack('Footer', 'VERTICAL', 0)
  footer.paddingTop = 16
  rule(footer, 'top')
  fill(body, footer)
  fill(footer, text(report.footer, 12, REGULAR, META))

  page.selection = [root]
  figma.viewport.scrollAndZoomIntoView([root])
  return { frameName: root.name, page: page.name }
}
