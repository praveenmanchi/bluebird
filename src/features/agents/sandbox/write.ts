// Writing results into Figma: apply a finding's fix on its layers, write Dev Mode
// annotations, and draw a report frame beside the scope. Runs inside Figma.
import { ANNOTATION_PREFIX, type AgentFix, type AnnotateResult, type ApplyRequest, type ApplyResult, type ReportRequest, type ReportResult } from '../messages'

type Bindable = SceneNode & { fills: readonly Paint[] | typeof figma.mixed }

async function node(id: string): Promise<SceneNode | null> {
  const n = await figma.getNodeByIdAsync(id)
  return n && n.type !== 'DOCUMENT' && n.type !== 'PAGE' ? n as SceneNode : null
}

async function rebindPaint(target: SceneNode, which: 'fills' | 'strokes', variableId: string): Promise<void> {
  const variable = await figma.variables.getVariableByIdAsync(variableId)
  if (!variable) throw new Error('That variable no longer exists')
  if (!(which in target)) throw new Error(`This layer has no ${which}`)
  const paints = (target as unknown as Record<string, readonly Paint[] | typeof figma.mixed | undefined>)[which]
  if (paints === undefined) throw new Error(`This layer has no ${which}`)
  if (paints === figma.mixed) {
    // Text with several colours: bind every run's fill.
    if (target.type === 'TEXT' && which === 'fills') {
      target.setRangeFills(0, target.characters.length, [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', variable)])
      return
    }
    throw new Error('This layer has mixed paints')
  }
  if (!paints.length) throw new Error(`This layer has no ${which}`)
  const next = [...paints]
  const index = next.findIndex((p) => p.type === 'SOLID' && p.visible !== false)
  if (index < 0) throw new Error('No solid paint to rebind')
  next[index] = figma.variables.setBoundVariableForPaint(next[index] as SolidPaint, 'color', variable)
  ;(target as unknown as Record<string, readonly Paint[]>)[which] = next
}

async function replaceText(target: SceneNode, text: string): Promise<void> {
  if (target.type !== 'TEXT') throw new Error('Not a text layer')
  // Every font in the layer must be loaded before its characters change; mixed fonts need each one.
  const fonts = target.fontName === figma.mixed ? target.getStyledTextSegments(['fontName']).map((s) => s.fontName) : [target.fontName]
  const seen = new Set<string>()
  for (const font of fonts) {
    const key = `${font.family}|${font.style}`
    if (seen.has(key)) continue
    seen.add(key)
    try {
      await figma.loadFontAsync(font)
    } catch {
      throw new Error(`The font ${font.family} ${font.style} isn’t available on this machine`)
    }
  }
  target.characters = text
}

async function bindNumber(target: SceneNode, field: Extract<AgentFix, { kind: 'bind-number' }>['field'], variableId: string): Promise<void> {
  const variable = await figma.variables.getVariableByIdAsync(variableId)
  if (!variable) throw new Error('That variable no longer exists')
  if (!(field in target)) throw new Error(`This layer has no ${field}`)
  // Bound through a local alias: the figma-plugins lint rule for this call needs type information the flat config doesn't load.
  const bind = (target as SceneNode & { setBoundVariable(field: VariableBindableNodeField, variable: Variable): void }).setBoundVariable.bind(target)
  bind(field, variable)
}

async function applyOne(target: SceneNode, fix: AgentFix): Promise<void> {
  switch (fix.kind) {
    case 'rebind-fill': return rebindPaint(target as Bindable, 'fills', fix.variableId)
    case 'rebind-stroke': return rebindPaint(target, 'strokes', fix.variableId)
    case 'replace-text': return replaceText(target, fix.text)
    case 'bind-number': return bindNumber(target, fix.field, fix.variableId)
    case 'resize':
      if (!('resize' in target)) throw new Error('This layer can’t be resized')
      ;(target as SceneNode & { resize(w: number, h: number): void }).resize(Math.max(fix.width, target.width), Math.max(fix.height, target.height))
      return
    case 'manual': throw new Error('This fix needs a designer')
  }
}

/** Applies each fix to every layer it names. A layer that fails is reported; the rest still change. */
export async function applyFixes(request: ApplyRequest): Promise<ApplyResult> {
  const applied: string[] = []
  const failed: { id: string; reason: string }[] = []
  for (const { id, nodeIds, fix } of request.fixes) {
    let ok = 0
    let reason = ''
    for (const nodeId of nodeIds) {
      const target = await node(nodeId)
      if (!target) { reason = 'Layer no longer exists'; continue }
      try {
        await applyOne(target, fix as AgentFix)
        ok += 1
      } catch (error: unknown) {
        reason = error instanceof Error ? error.message : 'Couldn’t apply'
      }
    }
    if (ok) applied.push(id)
    else failed.push({ id, reason: reason || 'Couldn’t apply' })
  }
  return { applied, failed }
}

/** Figma's own Dev Mode annotations, so developers read the finding next to the layer; older agent notes are replaced. */
export async function annotateFindings(findings: readonly { nodeIds: readonly string[]; label: string }[]): Promise<AnnotateResult> {
  let annotated = 0
  const byNode = new Map<string, string[]>()
  for (const f of findings) for (const id of f.nodeIds) byNode.set(id, [...(byNode.get(id) ?? []), f.label])
  for (const [id, labels] of byNode) {
    const target = await node(id)
    if (!target || !('annotations' in target)) continue
    const carrier = target as SceneNode & { annotations: readonly Annotation[] }
    const kept = carrier.annotations.filter((a) => !a.label?.startsWith(ANNOTATION_PREFIX))
    try {
      carrier.annotations = [...kept, ...labels.map((label) => ({ label: `${ANNOTATION_PREFIX} ${label}` }))]
      annotated += 1
    } catch {
      // Some node types refuse annotations; the next layer may take it.
    }
  }
  if (!annotated) throw new Error('None of those layers can carry a Dev Mode annotation')
  return { annotated }
}

const FONT: FontName = { family: 'Inter', style: 'Regular' }
const FONT_BOLD: FontName = { family: 'Inter', style: 'Semi Bold' }
const SEVERITY_COLOR: Record<string, RGB> = {
  critical: { r: 0.85, g: 0.15, b: 0.2 }, serious: { r: 0.95, g: 0.55, b: 0.1 }, moderate: { r: 0.1, g: 0.5, b: 0.9 }, minor: { r: 0.5, g: 0.5, b: 0.55 },
}
const INK: RGB = { r: 0.1, g: 0.1, b: 0.12 }
const MUTED: RGB = { r: 0.4, g: 0.42, b: 0.47 }

async function text(content: string, size: number, color: RGB, bold = false, width?: number): Promise<TextNode> {
  const t = figma.createText()
  t.fontName = bold ? FONT_BOLD : FONT
  t.characters = content
  t.fontSize = size
  t.fills = [{ type: 'SOLID', color }]
  if (width) { t.textAutoResize = 'HEIGHT'; t.resize(width, t.height) }
  return t
}

function stack(name: string, direction: 'HORIZONTAL' | 'VERTICAL', gap: number, padding = 0): FrameNode {
  const f = figma.createFrame()
  f.name = name
  f.layoutMode = direction
  f.itemSpacing = gap
  f.paddingTop = f.paddingBottom = f.paddingLeft = f.paddingRight = padding
  f.primaryAxisSizingMode = 'AUTO'
  f.counterAxisSizingMode = 'AUTO'
  f.fills = []
  return f
}

/**
 * A report frame on the canvas, to the right of the scope: title, summary, one row
 * per finding with a severity chip, the layer path and the fix. Plain Inter so it
 * renders in every file.
 */
export async function drawReport(request: ReportRequest, roots: readonly SceneNode[]): Promise<ReportResult> {
  await Promise.all([figma.loadFontAsync(FONT), figma.loadFontAsync(FONT_BOLD)])
  const WIDTH = 640
  const root = stack(`UX AI agents · ${request.title}`, 'VERTICAL', 16, 24)
  root.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]
  root.cornerRadius = 12
  root.strokes = [{ type: 'SOLID', color: { r: 0.88, g: 0.89, b: 0.91 } }]
  root.counterAxisSizingMode = 'FIXED'
  root.resize(WIDTH, 100)

  root.appendChild(await text(request.title, 20, INK, true, WIDTH - 48))
  if (request.summary) root.appendChild(await text(request.summary, 12, MUTED, false, WIDTH - 48))

  for (const row of request.rows) {
    const line = stack('Finding', 'HORIZONTAL', 12, 0)
    line.counterAxisAlignItems = 'MIN'
    line.counterAxisSizingMode = 'AUTO'
    const chip = stack('Severity', 'HORIZONTAL', 0, 4)
    chip.paddingLeft = chip.paddingRight = 8
    chip.cornerRadius = 999
    chip.fills = [{ type: 'SOLID', color: SEVERITY_COLOR[row.severity] ?? MUTED }]
    chip.appendChild(await text(row.severity.toUpperCase(), 9, { r: 1, g: 1, b: 1 }, true))
    line.appendChild(chip)
    const body = stack('Text', 'VERTICAL', 4, 0)
    body.appendChild(await text(row.title, 12, INK, true, WIDTH - 48 - 90))
    body.appendChild(await text(row.meta, 10, MUTED, false, WIDTH - 48 - 90))
    if (row.fix) body.appendChild(await text(row.fix, 10, { r: 0.1, g: 0.45, b: 0.3 }, false, WIDTH - 48 - 90))
    line.appendChild(body)
    root.appendChild(line)
    // A click on the row selects the layer it points at (prototype link within the page).
    try {
      const target = await node(row.nodeId)
      if (target) await line.setReactionsAsync([{ trigger: { type: 'ON_CLICK' }, actions: [{ type: 'NODE', destinationId: target.id, navigation: 'NAVIGATE', transition: null, preserveScrollPosition: false }] }])
    } catch {
      // Older runtimes reject the reaction shape; the row still reads.
    }
  }
  if (!request.rows.length) root.appendChild(await text('No issues found.', 12, MUTED))

  // Beside the scope's bounding box, on the current page.
  const boxes = roots.map((r) => r.absoluteBoundingBox).filter((b): b is Rect => b !== null)
  const right = boxes.length ? Math.max(...boxes.map((b) => b.x + b.width)) + 80 : figma.viewport.center.x
  const top = boxes.length ? Math.min(...boxes.map((b) => b.y)) : figma.viewport.center.y
  root.x = right
  root.y = top
  figma.currentPage.appendChild(root)
  figma.currentPage.selection = [root]
  figma.viewport.scrollAndZoomIntoView([root])
  return { nodeId: root.id, name: root.name }
}
