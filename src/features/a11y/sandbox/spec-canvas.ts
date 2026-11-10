// Draws the developer spec (Figma "Accessibility spec · Results", 40002672:29080)
// from a SpecDoc. Runs inside Figma; the content was decided in doc/spec-doc.ts.
import type { DocBranding } from '../doc/types'
import type { SpecDoc } from '../doc/spec-doc'
import { CONTENT_WIDTH, SPACE, footer, page, solid, table, type Kit } from './doc-kit'

type StampKind = 'focus' | 'heading' | 'landmark'

const CANVAS_MAX = { width: 560, height: 720 }
const CANVAS_PAD = 40

function stamp(kit: Kit, kind: StampKind, label: string): FrameNode {
  const s = kit.stack('HORIZONTAL', { name: `${kind} · ${label}`, padX: 6, padY: 2, fill: kit.theme.annotation[kind] })
  s.primaryAxisAlignItems = 'CENTER'
  s.counterAxisAlignItems = 'CENTER'
  s.cornerRadius = kind === 'focus' ? 100 : 2
  if (kind === 'focus') { s.minWidth = 22; s.minHeight = 22 }
  s.appendChild(kit.text(label, { size: 'small', weight: 'bold', color: kit.theme.annotation.on, name: 'Label' }))
  return s
}

function details(kit: Kit, parent: FrameNode, doc: SpecDoc): void {
  const row = kit.fill(parent, kit.stack('HORIZONTAL', { name: 'Spec details', gap: SPACE.block, padY: SPACE.stack, stroke: kit.theme.border, sides: { top: true, bottom: true } }))
  for (const d of doc.details) {
    const col = kit.stack('VERTICAL', { name: d.key, gap: SPACE.tight })
    row.appendChild(col)
    col.layoutGrow = 1
    kit.fill(col, kit.text(d.key, { size: 'small', color: kit.theme.meta, name: 'Key' }))
    const v = kit.fill(col, kit.text(d.value, { weight: 'semibold', color: kit.theme.title, name: 'Value' }))
    v.textAutoResize = 'HEIGHT'
  }
}

/** A copy of the screen, scaled to fit, with focus numbers, heading levels and landmark outlines on top. */
async function annotated(kit: Kit, body: FrameNode, doc: SpecDoc): Promise<void> {
  const { theme } = kit
  const block = kit.fill(body, kit.stack('VERTICAL', { name: 'Annotated screen', gap: SPACE.stack }))
  kit.heading(block, 'Annotated screen', 'focus order, headings and landmarks')
  const row = kit.fill(block, kit.stack('HORIZONTAL', { name: 'Screen and legend', gap: SPACE.block }))

  const source = await figma.getNodeByIdAsync(doc.rootId)
  const scale = Math.min(1, CANVAS_MAX.width / doc.rootSize.width, CANVAS_MAX.height / doc.rootSize.height)
  const canvas = figma.createFrame()
  canvas.name = 'Canvas'
  canvas.fills = [solid(theme.subtle)]
  canvas.cornerRadius = 8
  canvas.clipsContent = true
  canvas.resize(doc.rootSize.width * scale + CANVAS_PAD * 2, doc.rootSize.height * scale + CANVAS_PAD * 2)
  row.appendChild(canvas)
  if (source && 'clone' in source) {
    const copy = (source as FrameNode).clone()
    copy.name = `Screen · ${doc.title}`
    canvas.appendChild(copy)
    if (scale < 1) copy.rescale(scale)
    copy.x = CANVAS_PAD
    copy.y = CANVAS_PAD
    copy.locked = true
  }
  const at = (b: { x: number; y: number }) => ({ x: CANVAS_PAD + b.x * scale, y: CANVAS_PAD + b.y * scale })

  for (const l of doc.landmarks) {
    const p = at(l.box)
    const outline = figma.createRectangle()
    outline.name = `Landmark outline · ${l.role}`
    canvas.appendChild(outline)
    outline.x = p.x + 1
    outline.y = p.y + 1
    outline.resize(Math.max(4, l.box.width * scale - 2), Math.max(4, l.box.height * scale - 2))
    outline.fills = []
    outline.strokes = [solid(theme.annotation.landmark)]
    outline.strokeWeight = 2
    outline.dashPattern = [6, 4]
    const tag = stamp(kit, 'landmark', l.role)
    canvas.appendChild(tag)
    tag.x = p.x + l.box.width * scale - tag.width - 6
    tag.y = p.y + 4
  }
  for (const h of doc.headings) {
    const p = at(h.box)
    const tag = stamp(kit, 'heading', `H${h.level}`)
    canvas.appendChild(tag)
    tag.x = Math.max(2, p.x - tag.width - 4)
    tag.y = p.y + (h.box.height * scale) / 2 - tag.height / 2
  }
  for (const r of doc.rows) {
    const p = at(r.box)
    const tag = stamp(kit, 'focus', String(r.order))
    canvas.appendChild(tag)
    tag.x = Math.max(2, p.x - 8)
    tag.y = Math.max(2, p.y - 8)
  }

  const legend = kit.stack('VERTICAL', { name: 'Legend', gap: SPACE.block })
  row.appendChild(legend)
  legend.layoutGrow = 1
  const group = (title: string, kind: StampKind, items: readonly (readonly [string, string])[]): void => {
    if (!items.length) return
    const g = kit.fill(legend, kit.stack('VERTICAL', { name: title, gap: SPACE.inline }))
    g.appendChild(kit.text(title, { size: 'h3', weight: 'semibold', color: theme.title, name: 'Title' }))
    for (const [label, text] of items) {
      const line = kit.fill(g, kit.stack('HORIZONTAL', { name: `${label} ${text}`, gap: SPACE.inset }))
      line.counterAxisAlignItems = 'CENTER'
      line.appendChild(stamp(kit, kind, label))
      const t = kit.text(text, { name: 'Text' })
      line.appendChild(t)
      t.layoutGrow = 1
      t.textAutoResize = 'HEIGHT'
    }
  }
  group('Focus order', 'focus', doc.rows.map((r) => [String(r.order), r.name] as const))
  group('Headings', 'heading', doc.headings.map((h) => [`H${h.level}`, h.text] as const))
  group('Landmarks', 'landmark', doc.landmarks.map((l) => [l.role, l.name] as const))
  const note = kit.fill(legend, kit.text('Focus follows reading order: top to bottom, left to right. Renumber only where the screen should differ.', { size: 'small', color: theme.meta, name: 'Note' }))
  note.textAutoResize = 'HEIGHT'
}

export async function renderSpec(kit: Kit, doc: SpecDoc, branding: DocBranding, createdBy: string): Promise<FrameNode> {
  const { theme } = kit
  const { root, body } = page(kit, `Accessibility spec · ${doc.title}`, branding, createdBy)

  const header = kit.fill(body, kit.stack('VERTICAL', { name: 'Header', gap: SPACE.stack }))
  header.appendChild(kit.text(doc.title, { size: 'display', weight: 'bold', color: theme.title, name: 'Title' }))
  header.appendChild(kit.text(doc.intro, { width: 760, name: 'Intro' }))
  details(kit, header, doc)

  const ready = kit.fill(body, kit.stack('VERTICAL', { name: 'Before you build', gap: SPACE.stack }))
  kit.heading(ready, 'Before you build', 'what this spec depends on')
  table(kit, ready, 'Table', [['Dependency', 300], ['Status', 180], ['Detail', null], ['Owner', 140]], doc.dependencies, (d, column) => {
    if (column === 0) return kit.text(d.item, { weight: 'semibold', color: theme.title })
    if (column === 1) return kit.badge(d.status.tone, d.status.label)
    return kit.text(column === 2 ? d.detail : d.owner)
  })

  await annotated(kit, body, doc)

  const comps = kit.fill(body, kit.stack('VERTICAL', { name: 'Components', gap: SPACE.stack }))
  kit.heading(comps, 'Components', doc.rows.length ? `${doc.rows.length} · numbers match the screen` : 'no interactive layers found')
  if (doc.rows.length) {
    table(kit, comps, 'Table', [['#', 40], ['Component', 196], ['Role and element', 172], ['Accessible name', 184], ['States to build', null], ['Keyboard', 196]], doc.rows, (r, column) => {
      switch (column) {
        case 0: return stamp(kit, 'focus', String(r.order))
        case 1: return stackOf(kit, [kit.text(r.name, { weight: 'semibold', color: theme.title, width: 196 }), kit.text(r.component, { size: 'small', weight: 'mono', color: theme.meta, width: 196 })])
        case 2: return stackOf(kit, [kit.text(r.role, { color: theme.title, width: 172 }), kit.text(r.aria, { size: 'small', weight: 'mono', color: theme.meta, width: 172 })])
        case 3: return r.needsName
          ? stackOf(kit, [kit.badge('serious', 'Needs design input'), kit.text(r.accessibleName, { size: 'small', width: 184 })])
          : kit.text(r.accessibleName)
        case 4: return kit.text(r.states, { color: r.missingFocus ? theme.severity.serious.fg : theme.body })
        default: return kit.text(r.keyboard, { size: 'small' })
      }
    })
  }

  const notes = kit.fill(body, kit.stack('VERTICAL', { name: 'Implementation notes', gap: SPACE.stack }))
  kit.heading(notes, 'Implementation notes', 'patterns used on this screen')
  const grid = kit.fill(notes, kit.stack('HORIZONTAL', { name: 'Grid', gap: SPACE.stack }))
  grid.layoutWrap = 'WRAP'
  grid.counterAxisSpacing = SPACE.stack
  const half = (CONTENT_WIDTH - SPACE.stack) / 2
  for (const n of doc.notes) {
    const card = kit.stack('VERTICAL', { name: `Note · ${n.title}`, gap: SPACE.inline, padX: SPACE.stack, padY: SPACE.stack, stroke: theme.border, radius: true })
    grid.appendChild(card)
    card.counterAxisSizingMode = 'FIXED'
    card.resize(half, card.height)
    kit.fill(card, kit.text(n.title, { size: 'h3', weight: 'semibold', color: theme.title, name: 'Title' })).textAutoResize = 'HEIGHT'
    kit.fill(card, kit.text(n.body, { name: 'Body' })).textAutoResize = 'HEIGHT'
    const snip = kit.fill(card, kit.stack('VERTICAL', { name: 'Snippet', padX: SPACE.inset, padY: SPACE.inline, fill: theme.subtle, stroke: theme.border, radius: true }))
    kit.fill(snip, kit.text(n.code, { size: 'small', weight: 'mono', color: theme.title, name: 'Code' })).textAutoResize = 'HEIGHT'
  }

  const done = kit.fill(body, kit.stack('VERTICAL', { name: 'Done when', gap: SPACE.stack }))
  kit.heading(done, 'Done when', 'check these on the built screen')
  const list = kit.fill(done, kit.stack('VERTICAL', { name: 'Checklist', gap: SPACE.inline }))
  for (const item of doc.done) {
    const line = kit.fill(list, kit.stack('HORIZONTAL', { name: 'Item', gap: SPACE.inset }))
    line.counterAxisAlignItems = 'CENTER'
    const box = figma.createRectangle()
    box.name = 'Checkbox'
    box.resize(16, 16)
    box.cornerRadius = 3
    box.fills = [solid(theme.page)]
    box.strokes = [solid(theme.borderStrong)]
    box.strokeWeight = 1.5
    line.appendChild(box)
    const t = kit.text(item, { name: 'Text' })
    line.appendChild(t)
    t.layoutGrow = 1
    t.textAutoResize = 'HEIGHT'
  }

  footer(kit, body, doc.footer, branding)
  return root
}

function stackOf(kit: Kit, children: readonly SceneNode[]): FrameNode {
  const s = kit.stack('VERTICAL', { name: 'Cell', gap: SPACE.tight })
  for (const c of children) s.appendChild(c)
  return s
}
