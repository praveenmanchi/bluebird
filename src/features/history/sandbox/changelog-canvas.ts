// Runs inside Figma: draws a changelog entry as a card on the current page, so
// the file itself carries who changed what, for which ticket. The card is a
// plain frame with its own colours — the designer's file has none of
// Bluebird's variables — and everything it says comes from the entry.
import { hexToRgb } from '@shared/figma/color'
import type { HistoryEntry } from '@shared/history/types'

/** Rows drawn per group before "+ N more"; the full list is in History. */
export const CARD_ROWS = 12
const WIDTH = 520
const INK = '#18181B', BODY = '#52525B', META = '#71717A', LINE = '#E4E4E7', PAPER = '#FFFFFF', WASH = '#FAFAFA' // allow-raw: the changelog card has no Figma variables yet; fixed light palette drawn on the canvas
const TONE = { added: ['#16A34A', '#F0FDF4', 'Added'], modified: ['#0052CC', '#E8F0FF', 'Updated'], removed: ['#DC2626', '#FEF2F2', 'Deleted'] } as const // allow-raw: the changelog card has no Figma variables yet; fixed light palette drawn on the canvas
const STATUS = { review: ['#B45309', '#FFFBEB', 'Under review'], done: ['#16A34A', '#F0FDF4', 'Approved'], failed: ['#DC2626', '#FEF2F2', 'Failed'] } as const // allow-raw: the changelog card has no Figma variables yet; fixed light palette drawn on the canvas

type Weight = 'regular' | 'medium' | 'bold'
const FONTS: Readonly<Record<Weight, FontName>> = { regular: { family: 'Inter', style: 'Regular' }, medium: { family: 'Inter', style: 'Medium' }, bold: { family: 'Inter', style: 'Semi Bold' } }

const solid = (hex: string): SolidPaint => ({ type: 'SOLID', color: hexToRgb(hex) ?? { r: 0, g: 0, b: 0 } })

function text(content: string, size: number, weight: Weight, color: string, name = 'Text'): TextNode {
  const t = figma.createText()
  t.fontName = FONTS[weight]
  t.characters = content
  t.fontSize = size
  t.lineHeight = { unit: 'PIXELS', value: Math.round(size * 1.45) }
  t.fills = [solid(color)]
  t.name = name
  return t
}

function stack(name: string, direction: 'HORIZONTAL' | 'VERTICAL', gap: number): FrameNode {
  const f = figma.createFrame()
  f.name = name
  f.layoutMode = direction
  f.itemSpacing = gap
  f.primaryAxisSizingMode = 'AUTO'
  f.counterAxisSizingMode = 'AUTO'
  f.fills = []
  return f
}

/** Appends `child` stretched to the parent's width; text wraps instead of growing the card. */
function fill<T extends FrameNode | TextNode>(parent: FrameNode, child: T): T {
  parent.appendChild(child)
  child.layoutAlign = 'STRETCH'
  if (child.type === 'TEXT') child.textAutoResize = 'HEIGHT'
  return child
}

function badge(label: string, ink: string, wash: string): FrameNode {
  const b = stack(`Badge · ${label}`, 'HORIZONTAL', 0)
  b.paddingLeft = b.paddingRight = 8
  b.paddingTop = b.paddingBottom = 2
  b.cornerRadius = 6
  b.fills = [solid(wash)]
  b.appendChild(text(label, 11, 'medium', ink, 'Label'))
  return b
}

function meta(parent: FrameNode, key: string, value: string): void {
  const row = fill(parent, stack(key, 'HORIZONTAL', 8))
  const k = text(key, 12, 'regular', META, 'Key')
  row.appendChild(k)
  k.resize(96, k.height)
  const v = text(value, 12, 'medium', INK, 'Value')
  row.appendChild(v)
  v.layoutGrow = 1
  v.textAutoResize = 'HEIGHT'
}

function changes(parent: FrameNode, section: Extract<NonNullable<NonNullable<HistoryEntry['details']>['sections']>[number], { kind: 'changes' }>): void {
  const total = section.groups.reduce((n, g) => n + g.rows.length, 0)
  const box = fill(parent, stack(section.title, 'VERTICAL', 8))
  fill(box, text(`${section.title} · ${total}`, 13, 'bold', INK, 'Title'))
  for (const group of section.groups) {
    if (!group.rows.length) continue
    const [ink, wash, label] = TONE[group.change]
    const head = fill(box, stack(label, 'HORIZONTAL', 8))
    head.counterAxisAlignItems = 'CENTER'
    head.appendChild(badge(label, ink, wash))
    head.appendChild(text(String(group.rows.length), 11, 'regular', META, 'Count'))
    for (const r of group.rows.slice(0, CARD_ROWS)) {
      const value = r.valueKind === 'text' ? r.note ?? '' : [r.old, r.new].filter(Boolean).join(' → ')
      const row = fill(box, stack(r.name, 'VERTICAL', 2))
      row.paddingLeft = row.paddingRight = 10
      row.paddingTop = row.paddingBottom = 6
      row.cornerRadius = 8
      row.fills = [solid(WASH)]
      fill(row, text(r.name, 12, 'medium', INK, 'Name'))
      if (value) fill(row, text(`${value}${r.scope ? ` · ${r.scope}` : ''}${r.breaking ? ' · Breaking' : ''}`, 11, 'regular', BODY, 'Detail'))
    }
    if (group.rows.length > CARD_ROWS) fill(box, text(`+ ${group.rows.length - CARD_ROWS} more in History`, 11, 'regular', META, 'More'))
  }
}

const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

/** Draws the card in the middle of what the designer is looking at and selects it. */
export async function drawChangelogCard(entry: HistoryEntry): Promise<void> {
  await Promise.all(Object.values(FONTS).map((font) => figma.loadFontAsync(font)))
  const card = stack(`Changelog · ${entry.title}`, 'VERTICAL', 16)
  card.counterAxisSizingMode = 'FIXED'
  card.resize(WIDTH, card.height)
  card.paddingLeft = card.paddingRight = card.paddingTop = card.paddingBottom = 24
  card.cornerRadius = 12
  card.fills = [solid(PAPER)]
  card.strokes = [solid(LINE)]
  card.strokeWeight = 1

  const badges = fill(card, stack('Badges', 'HORIZONTAL', 8))
  badges.appendChild(badge('Changelog', META, WASH))
  const [ink, wash, label] = STATUS[entry.status]
  badges.appendChild(badge(label, ink, wash))
  fill(card, text(entry.title, 18, 'bold', INK, 'Title'))
  if (entry.details?.description) fill(card, text(entry.details.description, 12, 'regular', BODY, 'Description'))

  const facts = fill(card, stack('Details', 'VERTICAL', 6))
  facts.paddingTop = facts.paddingBottom = 12
  facts.strokes = [solid(LINE)]
  facts.strokeWeight = 0
  facts.strokeTopWeight = facts.strokeBottomWeight = 1
  meta(facts, 'Jira ticket', entry.ticket ?? 'None')
  meta(facts, 'Changed by', `${entry.by.name}${entry.by.team ? ` · ${entry.by.team}` : ''}`)
  meta(facts, 'Date', day(entry.at))
  meta(facts, 'File', entry.file)
  if (entry.review) meta(facts, 'Approved by', `${entry.review.by} · ${day(entry.review.at)}`)

  const sections = (entry.details?.sections ?? []).flatMap((s) => s.kind === 'changes' ? [s] : [])
  for (const s of sections) changes(card, s)
  if (!sections.length) fill(card, text('No variable or component changes were found.', 12, 'regular', BODY, 'Empty'))

  figma.currentPage.appendChild(card)
  card.x = Math.round(figma.viewport.center.x - WIDTH / 2)
  card.y = Math.round(figma.viewport.center.y - card.height / 2)
  figma.currentPage.selection = [card]
  figma.viewport.scrollAndZoomIntoView([card])
}
