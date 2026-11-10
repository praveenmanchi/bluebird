// Draws the Figma report (Figma "Figma report · Login screen", 40002664:28933) from a
// ReportDoc. Runs inside Figma; every decision about content was made in doc/report-doc.ts.
import type { DocBranding, ReportDoc, ReportIssue } from '../doc/types'
import { MAX_LINKS } from '../doc/report-doc'
import { SPACE, footer, page, solid, table, type Kit } from './doc-kit'

const LINKABLE = new Set<NodeType>(['FRAME', 'INSTANCE', 'COMPONENT', 'COMPONENT_SET', 'SECTION', 'GROUP'])

/** Figma links only to frames, groups, instances and sections — never a text layer — so use the nearest one. */
async function linkTarget(nodeId: string): Promise<{ id: string; label: string } | null> {
  const node = await figma.getNodeByIdAsync(nodeId)
  if (!node || node.type === 'DOCUMENT' || node.type === 'PAGE') return null
  let target: BaseNode | null = node
  while (target && !LINKABLE.has(target.type)) target = target.parent
  if (!target || target.type === 'PAGE' || target.type === 'DOCUMENT') return null
  let screen: BaseNode = node
  while (screen.parent && screen.parent.type !== 'PAGE' && screen.parent.type !== 'SECTION') screen = screen.parent
  const name = node.name.length > 32 ? `${node.name.slice(0, 32).trim()}…` : node.name
  return { id: target.id, label: screen.id === node.id ? name : `${screen.name} › ${name}` }
}

function link(kit: Kit, label: string, targetId: string): FrameNode {
  const row = kit.stack('HORIZONTAL', { name: `Go to · ${label}`, gap: SPACE.tight })
  row.counterAxisAlignItems = 'CENTER'
  row.appendChild(kit.icon('link', kit.theme.accent))
  const t = kit.text(label, { color: kit.theme.accent, name: 'Label' })
  t.textDecoration = 'UNDERLINE'
  t.hyperlink = { type: 'NODE', value: targetId }
  row.appendChild(t)
  return row
}

function details(kit: Kit, parent: FrameNode, items: ReportDoc['details']): void {
  const { theme } = kit
  const row = kit.fill(parent, kit.stack('HORIZONTAL', { name: 'Scan details', gap: SPACE.block, padY: SPACE.stack, stroke: theme.border, sides: { top: true, bottom: true } }))
  for (const d of items) {
    const col = kit.stack('VERTICAL', { name: d.key, gap: SPACE.tight })
    row.appendChild(col)
    col.layoutGrow = 1
    kit.fill(col, kit.text(d.key, { size: 'small', color: theme.meta, name: 'Key' }))
    const v = kit.fill(col, kit.text(d.value, { weight: 'semibold', color: theme.title, name: 'Value' }))
    v.textAutoResize = 'HEIGHT'
  }
}

function summary(kit: Kit, body: FrameNode, doc: ReportDoc): void {
  const { theme } = kit
  const s = kit.fill(body, kit.stack('VERTICAL', { name: 'Summary', gap: SPACE.block }))
  const v = kit.fill(s, kit.stack('VERTICAL', { name: 'Verdict', gap: SPACE.inline }))
  const vr = kit.stack('HORIZONTAL', { name: 'Verdict row', gap: SPACE.inset })
  vr.counterAxisAlignItems = 'CENTER'
  v.appendChild(vr)
  vr.appendChild(kit.badge(doc.verdict.badge.tone, doc.verdict.badge.label))
  vr.appendChild(kit.text(doc.verdict.headline, { size: 'h2', weight: 'semibold', color: theme.title, name: 'Verdict' }))
  v.appendChild(kit.text(doc.verdict.summary, { width: 760, name: 'Summary text' }))

  const tiles = kit.fill(s, kit.stack('HORIZONTAL', { name: 'Totals', gap: SPACE.stack }))
  for (const t of doc.totals) {
    const tile = kit.stack('VERTICAL', { name: `Total · ${t.label}`, gap: SPACE.tight, padX: SPACE.stack, padY: SPACE.stack, stroke: theme.border, radius: true })
    tiles.appendChild(tile)
    tile.layoutGrow = 1
    tile.appendChild(kit.text(t.value, { size: 'display', weight: 'bold', color: theme.title, name: 'Value' }))
    tile.appendChild(kit.text(t.label, { weight: 'semibold', color: theme.title, name: 'Label' }))
    tile.appendChild(kit.text(t.note, { size: 'small', color: theme.meta, name: 'Note' }))
  }

  const tally = (name: string, items: readonly (readonly [SceneNode, number])[]): void => {
    const row = kit.fill(s, kit.stack('HORIZONTAL', { name, gap: SPACE.stack }))
    row.counterAxisAlignItems = 'CENTER'
    row.appendChild(kit.text(name, { size: 'small', weight: 'semibold', color: theme.meta, name: 'Label' }))
    for (const [chip, n] of items) {
      const g = kit.stack('HORIZONTAL', { name: chip.name, gap: 6 })
      g.counterAxisAlignItems = 'CENTER'
      g.appendChild(chip)
      g.appendChild(kit.text(String(n), { weight: 'semibold', color: theme.title, name: 'Count' }))
      row.appendChild(g)
    }
  }
  tally('By severity', (['critical', 'serious', 'moderate', 'minor'] as const).map((sev) => [kit.badge(sev, sev.charAt(0).toUpperCase() + sev.slice(1)), doc.severity[sev]] as const))
  tally('By type', ([['contrast', 'Contrast'], ['nontext', 'Non-text contrast'], ['target', 'Target size'], ['code', 'Code']] as const).map(([type, label]) => [typeChip(kit, type, label), doc.types[type]] as const))
}

function typeChip(kit: Kit, type: ReportIssue['type'], label?: string): FrameNode {
  const chip = kit.stack('HORIZONTAL', { name: `Check type · ${label ?? type}`, gap: SPACE.tight })
  chip.counterAxisAlignItems = 'CENTER'
  chip.appendChild(kit.icon(type, kit.theme.body))
  if (label) chip.appendChild(kit.text(label, { size: 'small', color: kit.theme.body, name: 'Label' }))
  return chip
}

const TYPE_LABEL: Readonly<Record<ReportIssue['type'], string>> = { contrast: 'Contrast', nontext: 'Non-text contrast', target: 'Target size', code: 'Code' }

function evidence(kit: Kit, issue: ReportIssue): FrameNode {
  const { theme } = kit
  const ev = kit.stack('VERTICAL', { name: 'Evidence', gap: SPACE.inset, padX: SPACE.block, padY: SPACE.block, fill: theme.subtle, radius: true })
  ev.primaryAxisSizingMode = 'FIXED'
  ev.counterAxisSizingMode = 'FIXED'
  ev.resize(360, 200)
  ev.primaryAxisAlignItems = 'CENTER'
  ev.counterAxisAlignItems = 'CENTER'
  const s = issue.sample
  const card = kit.stack('HORIZONTAL', { name: 'Sample', padX: SPACE.block, padY: SPACE.inset, fill: s.kind === 'target' ? theme.page : s.background })
  card.cornerRadius = 6
  card.primaryAxisAlignItems = 'CENTER'
  card.counterAxisAlignItems = 'CENTER'
  if (s.kind === 'contrast') {
    card.appendChild(kit.text(s.text.length > 36 ? `${s.text.slice(0, 36)}…` : s.text, { color: s.foreground, name: 'Sample text' }))
  } else if (s.kind === 'nontext') {
    const field = figma.createRectangle()
    field.name = 'Border sample'
    field.resize(200, 36)
    field.cornerRadius = 4
    field.fills = [solid(s.background)]
    field.strokes = [solid(s.foreground)]
    field.strokeWeight = 1
    card.appendChild(field)
  } else {
    // Shown at 200%: the required area dashed, the real target filled.
    const area = figma.createFrame()
    area.name = 'Target at 200%'
    area.resize(s.required * 2, s.required * 2)
    area.fills = []
    area.strokes = [solid(theme.severity.critical.fg)]
    area.dashPattern = [4, 3]
    area.strokeWeight = 1
    area.clipsContent = false
    const hit = figma.createRectangle()
    hit.name = 'Target'
    hit.resize(Math.max(2, s.width * 2), Math.max(2, s.height * 2))
    hit.x = (s.required * 2 - hit.width) / 2
    hit.y = (s.required * 2 - hit.height) / 2
    hit.cornerRadius = 3
    hit.fills = [solid(theme.accent)]
    area.appendChild(hit)
    card.appendChild(area)
  }
  ev.appendChild(card)
  const caption = s.kind === 'target' ? `${s.width} × ${s.height} · shown at 200%` : issue.measuredShort
  ev.appendChild(kit.text(caption, { size: 'small', weight: 'semibold', color: theme.severity[issue.severity].fg, name: 'Measure' }))
  return ev
}

function factRow(kit: Kit, parent: FrameNode, key: string): FrameNode {
  const r = kit.fill(parent, kit.stack('HORIZONTAL', { name: key, gap: SPACE.stack }))
  const k = kit.text(key, { size: 'small', weight: 'semibold', color: kit.theme.meta, name: 'Key', width: 104 })
  r.appendChild(k)
  return r
}

async function issueBlock(kit: Kit, parent: FrameNode, issue: ReportIssue): Promise<void> {
  const { theme } = kit
  const box = kit.fill(parent, kit.stack('VERTICAL', { name: `Issue · ${issue.id}`, stroke: theme.border, radius: true }))
  const top = kit.fill(box, kit.stack('HORIZONTAL', { name: 'Top', padX: SPACE.block, padY: SPACE.stack, gap: SPACE.stack, fill: theme.subtle, stroke: theme.border, sides: { bottom: true } }))
  top.counterAxisAlignItems = 'CENTER'
  const titles = kit.stack('VERTICAL', { name: 'Title group', gap: 2 })
  top.appendChild(titles)
  titles.layoutGrow = 1
  const meta = kit.stack('HORIZONTAL', { name: 'Meta line', gap: SPACE.inline })
  meta.counterAxisAlignItems = 'CENTER'
  titles.appendChild(meta)
  meta.appendChild(typeChip(kit, issue.type, TYPE_LABEL[issue.type]))
  meta.appendChild(kit.text(`· ${issue.id} · ${issue.principle} · Level ${issue.level}`, { size: 'small', color: theme.meta, name: 'Meta' }))
  titles.appendChild(kit.text(issue.criterion, { size: 'h3', weight: 'semibold', color: theme.title, name: 'Criterion' }))
  top.appendChild(kit.badge(issue.severity, issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1)))

  const bodyRow = kit.fill(box, kit.stack('HORIZONTAL', { name: 'Body', padX: SPACE.block, padY: SPACE.block, gap: SPACE.block }))
  bodyRow.appendChild(evidence(kit, issue))
  const facts = kit.stack('VERTICAL', { name: 'Facts', gap: SPACE.inset })
  bodyRow.appendChild(facts)
  facts.layoutGrow = 1
  for (const [index, f] of issue.facts.entries()) {
    const r = factRow(kit, facts, f.key)
    const v = kit.text(f.value, { color: f.tone ? theme.severity[f.tone].fg : theme.title, name: 'Value' })
    r.appendChild(v)
    v.layoutGrow = 1
    v.textAutoResize = 'HEIGHT'
    // Links to every affected layer sit right under the Layer row.
    if (index === 0) await goTo(kit, facts, issue.nodeIds)
  }
  const ref = factRow(kit, facts, 'Reference')
  const refText = kit.text(issue.reference.label, { color: theme.accent, name: 'Link' })
  refText.textDecoration = 'UNDERLINE'
  refText.hyperlink = { type: 'URL', value: issue.reference.url }
  ref.appendChild(refText)

  const fix = kit.fill(box, kit.stack('HORIZONTAL', { name: 'Fix', padX: SPACE.block, padY: SPACE.stack, gap: SPACE.block, stroke: theme.border, sides: { top: true } }))
  for (const [label, content, mono] of [['Design fix', issue.designFix, false], ['Code fix', issue.codeFix, true]] as const) {
    const col = kit.stack('VERTICAL', { name: label, gap: SPACE.tight })
    fix.appendChild(col)
    col.layoutGrow = 1
    col.appendChild(kit.text(label, { size: 'small', weight: 'semibold', color: theme.title, name: 'Label' }))
    if (mono) {
      const snippet = kit.fill(col, kit.stack('VERTICAL', { name: 'Snippet', padX: SPACE.inset, padY: SPACE.inline, fill: theme.subtle, stroke: theme.border, radius: true }))
      const code = kit.fill(snippet, kit.text(content, { size: 'small', weight: 'mono', color: theme.title, name: 'Code' }))
      code.textAutoResize = 'HEIGHT'
    } else {
      const t = kit.fill(col, kit.text(content, { name: 'Text' }))
      t.textAutoResize = 'HEIGHT'
    }
  }
}

async function goTo(kit: Kit, facts: FrameNode, nodeIds: readonly string[]): Promise<void> {
  const targets = (await Promise.all(nodeIds.slice(0, MAX_LINKS).map(linkTarget))).filter((t): t is { id: string; label: string } => t !== null)
  if (!targets.length) return
  const row = factRow(kit, facts, targets.length > 1 ? `Go to (${nodeIds.length})` : 'Go to')
  const col = kit.stack('VERTICAL', { name: 'Links', gap: SPACE.tight })
  row.appendChild(col)
  col.layoutGrow = 1
  for (const t of targets) col.appendChild(link(kit, t.label, t.id))
  if (nodeIds.length > targets.length) col.appendChild(kit.text(`and ${nodeIds.length - targets.length} more`, { size: 'small', color: kit.theme.meta }))
}

export async function renderReport(kit: Kit, doc: ReportDoc, branding: DocBranding, createdBy: string): Promise<FrameNode> {
  const { theme } = kit
  const { root, body } = page(kit, `Figma report · ${doc.title}`, branding, createdBy)

  const header = kit.fill(body, kit.stack('VERTICAL', { name: 'Header', gap: SPACE.stack }))
  header.appendChild(kit.text(doc.title, { size: 'display', weight: 'bold', color: theme.title, name: 'Title' }))
  details(kit, header, doc.details)
  summary(kit, body, doc)

  if (doc.issues.length) {
    const idx = kit.fill(body, kit.stack('VERTICAL', { name: 'Issues', gap: SPACE.stack }))
    kit.heading(idx, 'Issues', `${doc.issues.length} · each ID can become a ticket`)
    const firstLinks = await Promise.all(doc.issues.map((i) => linkTarget(i.nodeIds[0] ?? '')))
    table(kit, idx, 'Table', [['ID', 88], ['Criterion', 232], ['Severity', 120], ['Layer', 240], ['Measured', null], ['Go to', 112]], doc.issues, (issue, column) => {
      switch (column) {
        case 0: return kit.text(issue.id, { weight: 'mono', color: theme.body })
        case 1: {
          const c = kit.stack('HORIZONTAL', { name: 'Criterion', gap: SPACE.inline })
          c.counterAxisAlignItems = 'CENTER'
          c.appendChild(typeChip(kit, issue.type))
          c.appendChild(kit.text(issue.criterion, { color: theme.title, width: 200 }))
          return c
        }
        case 2: return kit.badge(issue.severity, issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1))
        case 3: return kit.text(issue.layer)
        case 4: return kit.text(issue.measuredShort)
        default: {
          const target = firstLinks[doc.issues.indexOf(issue)]
          return target ? link(kit, 'Open layer', target.id) : kit.text('—', { color: theme.meta })
        }
      }
    })

    const det = kit.fill(body, kit.stack('VERTICAL', { name: 'Issue details', gap: SPACE.block }))
    det.appendChild(kit.text('Issue details', { size: 'h2', weight: 'semibold', color: theme.title, name: 'Title' }))
    for (const issue of doc.issues) await issueBlock(kit, det, issue)
  }

  if (doc.manual.length) {
    const manual = kit.fill(body, kit.stack('VERTICAL', { name: 'Needs manual check', gap: SPACE.stack }))
    kit.heading(manual, 'Needs manual check', `${doc.manual.length} · Bluebird could not measure ${doc.manual.length === 1 ? 'this' : 'these'}`)
    const links = await Promise.all(doc.manual.map((m) => linkTarget(m.nodeId)))
    table(kit, manual, 'Table', [['Layer', 220], ['Why', 300], ['What to check', null], ['Go to', 112]], doc.manual, (m, column) => {
      if (column === 0) return kit.text(m.layer, { color: theme.title })
      if (column === 1) return kit.text(m.why)
      if (column === 2) return kit.text(m.check)
      const t = links[doc.manual.indexOf(m)]
      return t ? link(kit, 'Open layer', t.id) : kit.text('—', { color: theme.meta })
    })
  }

  const checks = kit.fill(body, kit.stack('VERTICAL', { name: 'Checks run', gap: SPACE.stack }))
  kit.heading(checks, 'Checks run', 'what this scan covered')
  table(kit, checks, 'Table', [['Criterion', 300], ['Result', 140], ['Layers checked', 200], ['Failing', null]], doc.checks, (c, column) => {
    if (column === 0) {
      const cell = kit.stack('HORIZONTAL', { name: 'Criterion', gap: SPACE.inline })
      cell.counterAxisAlignItems = 'CENTER'
      cell.appendChild(typeChip(kit, c.type))
      cell.appendChild(kit.text(c.criterion, { color: theme.title, width: 260 }))
      return cell
    }
    if (column === 1) return kit.badge(c.result.tone, c.result.label)
    return kit.text(column === 2 ? c.checked : c.failing)
  })

  footer(kit, body, doc.footer, branding)
  return root
}
