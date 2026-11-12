// Runs inside Figma. Everything that touches the document for this tab lives here.
import type { HandlerMap, HandlerContext } from '@shared/bridge'
import { traverse, scopeRoots } from '@shared/figma/traverse'
import { solidFill, solidStroke, solidFromPaints, resolveBackground, type BackgroundResolution } from '@shared/figma/paint'
import type { RGB, RGBA } from '@shared/figma/color'
import { blendOver, contrastRatio, rgbaToHex } from '@shared/figma/color'
import { brand } from '@shared/config'
import { isBoldStyle, rateContrast, requiredRatio, roundRatio } from '../contrast'
import { exemptionFor } from '../exempt'
import { contrastIgnoreKey, findIgnore, nonTextIgnoreKey, targetIgnoreKey, withIgnore, withoutIgnore } from '../ignore'
import { readIgnores, writeIgnores } from './ignores'
import { isBoundaryName, isDecorativeName, passesNonText } from '../nontext'
import { isControlName, hasSpacingException, rateTarget, requiredTarget, checksTargets, spacingExceptionApplies, type Box, type Platform } from '../target'
import { nearestPassingToken, verdictsAcrossModes } from '../tokens'
import { loadBrandPalette, modeColors, tokenLookup, type BrandPalette, type TokenLookup } from './variables'
import { buildInventory, type InventoryNode } from '../inventory'
import { summarizeScope } from '../scope-summary'
import { ruleIn } from '../rules'
import { DEFAULT_STANDARD, quickrefUrl, type StandardId } from '../standards'
import { createReport, createSpec } from './documents'
import {
  MSG, scanRequestSchema, focusRequestSchema, selectRequestSchema, applyFixRequestSchema, annotateRequestSchema, targetRequestSchema, openRulesRequestSchema, ignoreRequestSchema,
  type ContrastIssue, type ScanTarget, type ScanResult, type ScanProgress, type UnmeasurableText,
  type NonTextIssue, type TargetSizeIssue, type ExemptLayer, type IgnoredAt,
} from '../messages'

/** Enough to audit the exempt count without burying the report. */
const EXEMPT_LIST_LIMIT = 200

/** One text node's verdict before findings are grouped. */
type Finding =
  | { kind: 'ok' }
  | { kind: 'exempt'; entry: ExemptLayer }
  | { kind: 'unmeasurable'; entry: UnmeasurableText }
  | { kind: 'issue'; entry: Omit<ContrastIssue, 'nodeIds' | 'occurrences'> }

async function scan(payload: unknown, ctx: HandlerContext): Promise<ScanResult> {
  const { scope, dedupeInstances = true, platform = 'web', standard = DEFAULT_STANDARD } = scanRequestSchema.parse(payload)
  const started = Date.now()
  const roots = scopeRoots(scope)
  const textNodes: TextNode[] = []

  figma.skipInvisibleInstanceChildren = true

  // Check each component once instead of once per instance. The first instance
  // of a component is walked in full; later ones are skipped and counted, so
  // the summary can say how much was collapsed rather than hiding it.
  const seenComponents = new Set<string>()
  let instancesSkipped = 0
  const skipChildren = async (node: SceneNode): Promise<boolean> => {
    // A hidden frame's children report visible=true; nothing in it is on screen.
    if (!node.visible) return true
    if (!dedupeInstances || node.type !== 'INSTANCE') return false
    // An instance with overrides may differ from the one already walked — a
    // red label in the third card is exactly the kind of thing a scan is for.
    if (hasOverrides(node)) return false
    const main = await mainComponentId(node)
    if (!main) return false
    // The same component on another surface is another measurement: a ghost
    // button that passes on white can fail on the dark hero beside it.
    const key = `${main}|${surroundingsKey(node)}`
    if (seenComponents.has(key)) { instancesSkipped += 1; return true }
    seenComponents.add(key)
    return false
  }

  // One pass feeds all three criteria: 1.4.3/1.4.6 text, 1.4.11 borders, 2.5.8 targets.
  const strokeNodes: SceneNode[] = []
  const targetNodes: TargetCandidate[] = []
  // Every instance met, for the Scan Summary's component inventory.
  const instanceNodes: InstanceNode[] = []

  const scanned = await traverse(
    roots,
    (node) => {
      if (!node.visible) return
      if (node.type === 'INSTANCE') instanceNodes.push(node)
      if (node.type === 'TEXT') { textNodes.push(node); return }
      if (hasVisibleStroke(node)) strokeNodes.push(node)
      const evidence = targetEvidence(node)
      if (evidence) targetNodes.push({ node, evidence })
    },
    { skipChildren, onProgress: (visited) => ctx.emit(MSG.progress, { visited } satisfies ScanProgress) },
  )

  // One read of the Brand collection per scan, shared by every finding.
  const { palette, paletteError } = await loadPalette()

  const grouped = new Map<string, ContrastIssue & { nodeIds: string[] }>()
  const unmeasurable: UnmeasurableText[] = []
  const exemptLayers: ExemptLayer[] = []
  let exempt = 0

  const lookup = tokenLookup(palette)
  for (const node of textNodes) {
    for (const finding of await evaluateText(node, palette, lookup)) {
      if (finding.kind === 'ok') continue
      // Counted whatever happens, and listed up to a point, so the number can be
      // audited without a report that is mostly exemptions.
      if (finding.kind === 'exempt') {
        exempt += 1
        if (exemptLayers.length < EXEMPT_LIST_LIMIT) exemptLayers.push(finding.entry)
        continue
      }
      if (finding.kind === 'unmeasurable') { unmeasurable.push(finding.entry); continue }

      // One card per distinct pair at a given size, not one per layer — and
      // not one per run either, when a node has two runs in the same style.
      const e = finding.entry
      // An assumed backdrop is a guess, not a measurement: it never shares a card
      // with a measured pair, or the card would present one as the other.
      const key = `${e.foreground}|${e.background}|${e.fontSize}|${e.isBold}|${e.assumedBackground ? 'assumed' : 'measured'}|${e.gradientBackground ? 'gradient' : 'flat'}`
      const existing = grouped.get(key)
      if (!existing) {
        grouped.set(key, { ...e, nodeIds: [e.nodeId], occurrences: 1 })
      } else if (!existing.nodeIds.includes(e.nodeId)) {
        existing.nodeIds.push(e.nodeId)
        existing.occurrences += 1
      }
    }
  }

  // A finding somebody has already marked as wrong comes back marked, not dropped:
  // it stays visible, out of the counts, and can be restored from its card.
  const ignores = readIgnores()
  const marked = <T extends { ignored?: IgnoredAt }>(list: readonly T[], keyOf: (f: T) => string): T[] =>
    list.map((f) => {
      const hit = findIgnore(ignores, keyOf(f))
      return hit ? { ...f, ignored: { at: hit.at } } : f
    })

  const issues = marked([...grouped.values()].sort((a, b) => a.ratio - b.ratio), contrastIgnoreKey)
  // A standard only gets the criteria it has: 1.4.11 arrived in 2.1, target size in 2.1 / 2.2.
  const nonText = ruleIn('1.4.11', standard) ? marked(collectNonText(strokeNodes), nonTextIgnoreKey) : []
  const targets = checksTargets(platform, standard) ? marked(collectTargets(targetNodes, platform, standard), targetIgnoreKey) : []

  // Inventory: which components and frames hold a finding. An ignored one fails nothing.
  const flagged = new Set([...issues, ...nonText, ...targets].filter((f) => !f.ignored).flatMap((f) => f.nodeIds))
  const candidates: SceneNode[] = [...textNodes, ...strokeNodes, ...targetNodes.map((t) => t.node)]
  const identities = await componentIdentities(instanceNodes)
  const inventory = buildInventory({
    roots: roots as unknown as readonly InventoryNode[],
    instances: instanceNodes as unknown as readonly InventoryNode[],
    findingNodes: candidates.filter((n) => flagged.has(n.id)) as unknown as readonly InventoryNode[],
    identityOf: (n) => identities.get(n.id),
  })

  return {
    scope,
    meta: { file: figma.root.name, page: figma.currentPage.name, brand: brand.label },
    standard,
    platform,
    scanned,
    textNodes: textNodes.length,
    issues,
    nonText,
    targets,
    exempt,
    exemptLayers,
    unmeasurable,
    instancesSkipped,
    paletteError,
    durationMs: Date.now() - started,
    inventory,
  }
}

/** Instance id → its component, at set level for variants (a Button's six variants are one
 *  component). Detached or unloadable instances are left out of the inventory. */
async function componentIdentities(instances: readonly InstanceNode[]): Promise<Map<string, { key: string; name: string }>> {
  const out = new Map<string, { key: string; name: string }>()
  for (const inst of instances) {
    try {
      const main = await inst.getMainComponentAsync()
      if (!main) continue
      const owner = main.parent?.type === 'COMPONENT_SET' ? main.parent : main
      out.set(inst.id, { key: owner.id, name: owner.name })
    } catch {
      // A component from a library that is not loaded: count nothing rather than guess.
    }
  }
  return out
}

/**
 * The point of the backdrop that gives the lowest ratio.
 *
 * A flat backdrop has one point. A gradient is a range and the text sits on all
 * of it, so the honest reading is its worst point, not an average nobody sees.
 */
function worstAgainst(fill: RGBA, backdrop: BackgroundResolution): { foreground: RGB; background: RGB; ratio: number } {
  let worst: { foreground: RGB; background: RGB; ratio: number } | undefined
  for (const background of backdrop.colors ?? [backdrop.color]) {
    const foreground = blendOver(fill, background)
    const ratio = contrastRatio(foreground, background)
    if (!worst || ratio < worst.ratio) worst = { foreground, background, ratio }
  }
  return worst ?? { foreground: backdrop.color, background: backdrop.color, ratio: 1 }
}

function hasVisibleStroke(node: SceneNode): boolean {
  return 'strokes' in node && Array.isArray(node.strokes) && node.strokes.some((s) => s.visible !== false)
}

/**
 * Is this a tap target? A prototype reaction is proof; a control-ish name is
 * the fallback for files that have not been prototyped.
 */
function targetEvidence(node: SceneNode): 'reaction' | 'control' | null {
  if (hasReaction(node)) return 'reaction'
  if (node.type === 'INSTANCE' && isControlName(node.name)) return 'control'
  return null
}

/** WCAG 1.4.11: a border must reach 3:1 against whatever it is drawn over. */
function collectNonText(nodes: readonly SceneNode[]): NonTextIssue[] {
  const grouped = new Map<string, NonTextIssue & { nodeIds: string[] }>()
  for (const node of nodes) {
    if (isDecorativeName(node.name)) continue
    const evidence = identifiesControl(node)
    if (!evidence) continue
    // The criterion leaves inactive components out, as 1.4.3 does.
    const chain = chainFor(node)
    if (exemptionFor(chain.names, chain.variants) === 'inactive') continue
    const stroke = solidStroke(node)
    if (!stroke) continue
    const backdrop = resolveBackground(node)
    if (backdrop.indeterminate || backdrop.assumed) continue
    // The criterion wants a perceivable boundary, not a perceivable stroke. A
    // faint stroke on a strongly filled button is not a failure: the fill is
    // the boundary. Only flag the stroke when it is doing the job alone.
    const own = solidFill(node)
    if (own && own.a >= 1 && passesNonText(worstAgainst(own, backdrop).ratio)) continue
    const worst = worstAgainst(stroke, backdrop)
    if (passesNonText(worst.ratio)) continue

    const foreground = rgbaToHex(worst.foreground)
    const background = rgbaToHex(worst.background)
    const key = `${foreground}|${background}`
    const existing = grouped.get(key)
    if (existing) {
      existing.nodeIds.push(node.id)
      existing.occurrences += 1
      // A stroke Figma proved interactive outranks one judged by its name.
      if (evidence === 'reaction') existing.evidence = 'reaction'
    } else {
      grouped.set(key, {
        nodeId: node.id, nodeIds: [node.id], occurrences: 1, name: node.name,
        foreground, background, ratio: roundRatio(worst.ratio), evidence,
        gradientBackground: backdrop.colors ? true : undefined,
      })
    }
  }
  return [...grouped.values()].sort((a, b) => a.ratio - b.ratio)
}

type TargetCandidate = { node: SceneNode; evidence: 'reaction' | 'control' }

/**
 * Which candidates are the things a person taps.
 *
 * The icon inside a button is not a second target, or a 16px glyph in a 44px
 * button gets flagged: a candidate holding one other candidate is the target.
 * A candidate holding several ("Button group", "Tab bar") is a container, and
 * its controls are the targets. A prototyped layer stays a target either way,
 * alongside the controls inside it.
 */
function resolveTargets(candidates: readonly TargetCandidate[]): TargetCandidate[] {
  const ids = new Set(candidates.map((c) => c.node.id))
  const inside = new Map<string, TargetCandidate[]>()
  const top: TargetCandidate[] = []
  for (const candidate of candidates) {
    let holder: string | null = null
    for (let p = candidate.node.parent; p && p.type !== 'PAGE'; p = p.parent) if (ids.has(p.id)) { holder = p.id; break }
    if (holder === null) top.push(candidate)
    else inside.set(holder, [...(inside.get(holder) ?? []), candidate])
  }
  const resolve = (candidate: TargetCandidate): TargetCandidate[] => {
    const held = inside.get(candidate.node.id) ?? []
    if (held.length < 2) return [candidate]
    const below = held.flatMap(resolve)
    return candidate.evidence === 'reaction' ? [candidate, ...below] : below
  }
  return top.flatMap(resolve)
}

/** WCAG 2.5.8 / 2.5.5, or the platform's minimum on iOS / Android: a target's smaller side decides. */
function collectTargets(candidates: readonly TargetCandidate[], platform: Platform, standard: StandardId): TargetSizeIssue[] {
  const outermost = resolveTargets(candidates)
  const boxOf = (node: SceneNode): Box => {
    const b = node.absoluteBoundingBox
    return b ? { x: b.x, y: b.y, width: b.width, height: b.height } : { x: 0, y: 0, width: node.width, height: node.height }
  }
  const boxes = new Map(outermost.map(({ node }) => [node.id, boxOf(node)] as const))

  const grouped = new Map<string, TargetSizeIssue & { nodeIds: string[] }>()
  for (const { node, evidence } of outermost) {
    const box = boxes.get(node.id)!
    const width = Math.round(box.width * 100) / 100
    const height = Math.round(box.height * 100) / 100
    const level = rateTarget(width, height, platform, standard)
    if (level === 'aaa') continue
    // 2.5.8 forgives an undersized target with clear space around it (web only, 2.2 only: Apple and Material ask for the hit area itself, and 2.1 has no minimum to forgive).
    if (level === 'fail' && spacingExceptionApplies(platform, standard)) {
      const others = [...boxes].filter(([id]) => id !== node.id).map(([, b]) => b)
      if (hasSpacingException(box, others)) continue
    }

    const key = `${width}x${height}|${level}`
    const existing = grouped.get(key)
    if (existing) {
      existing.nodeIds.push(node.id)
      existing.occurrences += 1
    } else {
      grouped.set(key, {
        nodeId: node.id, nodeIds: [node.id], occurrences: 1, name: node.name,
        width, height, required: requiredTarget(level, platform, standard), evidence, platform, standard,
      })
    }
  }
  return [...grouped.values()].sort((a, b) => Math.min(a.width, a.height) - Math.min(b.width, b.height))
}

/** What an instance is drawn on, and how dimmed: the things outside it that change its contrast. */
function surroundingsKey(node: SceneNode): string {
  const backdrop = resolveBackground(node)
  if (backdrop.indeterminate) return `unmeasurable:${backdrop.reason ?? ''}`
  return `${rgbaToHex(backdrop.color)}|${backdrop.assumed ? 'assumed' : 'measured'}|${backdrop.foregroundOpacity}`
}

/** Figma lists every property an instance changed; an empty list means it matches its main. */
function hasOverrides(node: InstanceNode): boolean {
  const overrides = (node as InstanceNode & { overrides?: readonly unknown[] }).overrides
  return Array.isArray(overrides) && overrides.length > 0
}

/** A detached or still-loading instance has no main component; then we do not dedupe. */
async function mainComponentId(node: InstanceNode): Promise<string | null> {
  try {
    const main = await node.getMainComponentAsync()
    return main?.id ?? null
  } catch {
    return null
  }
}

const COMPONENT_TYPES = new Set(['INSTANCE', 'COMPONENT', 'COMPONENT_SET'])

/** An instance's variant and boolean properties as "Name=value" (a boolean's key carries a "#id" suffix). */
function stateProps(node: InstanceNode): string[] {
  const props = node.componentProperties ?? {}
  const out: string[] = []
  for (const key of Object.keys(props)) {
    const prop = props[key]
    if (prop && (prop.type === 'VARIANT' || prop.type === 'BOOLEAN')) out.push(`${key.split('#')[0]}=${String(prop.value)}`)
  }
  return out
}

/**
 * Names and component states above a layer, for the WCAG "inactive" and "logotype" exemptions.
 *
 * A name only speaks for the component the layer belongs to. A plain frame or
 * section further up ("Disabled states", "Logo wall") is where the component
 * was placed, not what state it is in, so it exempts nothing.
 */
function chainFor(node: SceneNode): { names: string[]; variants: string[] } {
  const names: string[] = [node.name]
  const variants: string[] = node.type === 'INSTANCE' ? stateProps(node) : []
  let insideComponent = COMPONENT_TYPES.has(node.type)
  let parent: BaseNode | null = node.parent
  while (parent && parent.type !== 'PAGE' && parent.type !== 'DOCUMENT') {
    const isComponent = COMPONENT_TYPES.has(parent.type)
    if (isComponent || (!insideComponent && parent.type !== 'SECTION')) names.push(parent.name)
    if (parent.type === 'INSTANCE') variants.push(...stateProps(parent))
    if (isComponent) insideComponent = true
    parent = parent.parent
  }
  return { names, variants }
}

const hasReaction = (node: BaseNode): boolean => 'reactions' in node && Array.isArray(node.reactions) && node.reactions.length > 0

/**
 * 1.4.11 is about the boundary of a control, not every outline in the file: a
 * card's hairline is decoration. A stroke counts when its own layer is named
 * for a control, or it sits inside a control component or a prototyped layer.
 */
function identifiesControl(node: SceneNode): NonTextIssue['evidence'] | null {
  if (hasReaction(node)) return 'reaction'
  if (isBoundaryName(node.name)) return 'name'
  for (let p: BaseNode | null = node.parent; p && p.type !== 'PAGE' && p.type !== 'DOCUMENT'; p = p.parent) {
    if (hasReaction(p)) return 'reaction'
    if (COMPONENT_TYPES.has(p.type) && isBoundaryName(p.name)) return 'component'
  }
  return null
}

/**
 * A file without the Brand collection still scans; it just talks in hexes.
 *
 * A failure is reported rather than swallowed: when Figma cannot serve the
 * variables — the desktop app offline is the usual reason — every finding
 * silently loses its token names, its per-brand verdicts and its suggested fix,
 * and a scan that quietly says less is the thing this tab exists to prevent.
 */
async function loadPalette(): Promise<{ palette: BrandPalette | null; paletteError?: string }> {
  try {
    return { palette: await loadBrandPalette(brand.source.collection, brand.source.mode) }
  } catch (error: unknown) {
    return { palette: null, paletteError: error instanceof Error ? error.message : String(error) }
  }
}

/** One run of uniformly styled characters. A node with a bold word or a link holds several. */
interface TextRun {
  fill: RGBA | null
  fillVariableId?: string
  fontSize: number
  isBold: boolean
  characters: string
}

/** The variable bound to the paint the scan measures: the topmost visible one. */
function paintVariableId(fills: readonly Paint[]): string | undefined {
  for (let i = fills.length - 1; i >= 0; i -= 1) {
    const paint = fills[i]!
    if (paint.visible === false || (paint.opacity ?? 1) === 0) continue
    return paint.type === 'SOLID' ? paint.boundVariables?.color?.id : undefined
  }
  return undefined
}

/**
 * Split a text node into its styled runs. `fills` on the node is `figma.mixed`
 * the moment two runs differ, and the old code gave up there — which threw
 * away every paragraph with an inline link or a bold lead-in. Each run is
 * judged on its own colour and size.
 */
function textRuns(node: TextNode): TextRun[] {
  const opacity = node.opacity
  if (typeof node.getStyledTextSegments === 'function') {
    const segments = node.getStyledTextSegments(['fills', 'fontSize', 'fontName', 'fontWeight', 'boundVariables'])
    if (segments.length) {
      return segments.map((seg) => ({
        fill: solidFromPaints(seg.fills, opacity),
        // Figma records a text colour binding on the paint itself; the segment's own
        // `boundVariables` only lists typography, so reading it alone finds no token in a real file.
        fillVariableId: paintVariableId(seg.fills) ?? (seg.boundVariables as { fills?: readonly VariableAlias[] } | undefined)?.fills?.[0]?.id,
        fontSize: seg.fontSize,
        isBold: isBoldStyle(seg.fontName.style, seg.fontWeight),
        characters: seg.characters,
      }))
    }
  }
  // Older runtimes and unit-test fixtures: the node is one run.
  const fontName = node.fontName !== figma.mixed ? node.fontName : null
  return [{
    fill: solidFill(node),
    fillVariableId: textFillVariableId(node),
    fontSize: typeof node.fontSize === 'number' ? node.fontSize : 0,
    isBold: isBoldStyle(fontName?.style ?? '', typeof node.fontWeight === 'number' ? node.fontWeight : undefined),
    characters: node.characters,
  }]
}

async function evaluateText(node: TextNode, palette: BrandPalette | null, lookup: TokenLookup): Promise<Finding[]> {
  // Whitespace-only and zero-size text is not something anyone reads.
  if (!node.characters.trim() || node.opacity === 0) return [{ kind: 'ok' }]

  const { names, variants } = chainFor(node)
  const exemption = exemptionFor(names, variants)
  if (exemption) return [{ kind: 'exempt', entry: { nodeId: node.id, name: node.name, reason: exemption } }]

  const backdrop = resolveBackground(node)
  if (backdrop.indeterminate) {
    return [{ kind: 'unmeasurable', entry: { nodeId: node.id, name: node.name, text: node.characters.slice(0, 60), reason: backdrop.reason ?? 'backdrop could not be measured' } }]
  }

  const findings: Finding[] = []
  for (const run of textRuns(node)) {
    if (!run.fill || !run.characters.trim() || run.fontSize <= 0) continue
    // The run is as strong as its own alpha times everything dimming it.
    const fill = { ...run.fill, a: run.fill.a * backdrop.foregroundOpacity }
    // On a gradient this is its worst point; on a flat backdrop, the only one.
    const { foreground, background, ratio } = worstAgainst(fill, backdrop)
    const level = rateContrast(ratio, run.fontSize, run.isBold)
    if (level === 'aaa') continue

    const needed = requiredRatio(level, run.fontSize, run.isBold)
    const mode = brand.source.mode
    const fgBound = await lookup(run.fillVariableId)
    const bgBound = await lookup(backdrop.variableId)
    const fgModes = modeColors(palette, fgBound?.brandId)
    const bgModes = modeColors(palette, bgBound?.brandId)
    const brandModes = Object.keys(fgModes).length && Object.keys(bgModes).length
      ? verdictsAcrossModes(fgModes, bgModes, needed)
      : undefined
    const suggestion = palette
      ? nearestPassingToken(foreground, background, needed, textCandidates(palette), fill.a)
      : null

    findings.push({
      kind: 'issue',
      entry: {
        nodeId: node.id,
        name: node.name,
        text: run.characters.slice(0, 60),
        fontSize: run.fontSize,
        isBold: run.isBold,
        foreground: rgbaToHex(foreground),
        background: rgbaToHex(background),
        ratio: roundRatio(ratio),
        level,
        fgToken: fgBound && run.fillVariableId ? { id: run.fillVariableId, name: fgBound.name, mode } : undefined,
        bgToken: bgBound && backdrop.variableId ? { id: backdrop.variableId, name: bgBound.name, mode } : undefined,
        brandModes: brandModes && brandModes.length ? brandModes : undefined,
        fix: suggestion
          ? { tokenId: suggestion.id, tokenName: suggestion.name, hex: rgbaToHex(suggestion.rgb), ratio: roundRatio(suggestion.ratio), mode }
          : undefined,
        assumedBackground: backdrop.assumed || undefined,
        gradientBackground: backdrop.colors ? true : undefined,
      },
    })
  }
  return findings.length ? findings : [{ kind: 'ok' }]
}

/**
 * Only tokens meant for text may be suggested for text. A surface colour that
 * happens to pass is not a fix a design system would accept. Scopes are the
 * signal when the file sets them; the variable path is the fallback.
 */
function textCandidates(palette: BrandPalette) {
  const scoped = palette.entries.filter((e) => e.scopes.includes('ALL_SCOPES') || e.scopes.includes('TEXT_FILL'))
  if (scoped.length) return scoped
  const named = palette.entries.filter((e) => /(^|\/)(text|type|fg|foreground|on-)/i.test(e.name))
  return named.length ? named : palette.entries
}

/** The variable bound to a text node's first paint, when there is one. */
function textFillVariableId(node: TextNode): string | undefined {
  if (Array.isArray(node.fills)) {
    const onPaint = paintVariableId(node.fills)
    if (onPaint) return onPaint
  }
  const fills = node.boundVariables?.fills
  return Array.isArray(fills) ? fills[0]?.id : undefined
}

async function focus(payload: unknown): Promise<void> {
  const { nodeId } = focusRequestSchema.parse(payload)
  const node = await figma.getNodeByIdAsync(nodeId)
  if (!node || node.type === 'DOCUMENT' || node.type === 'PAGE') throw new Error('Layer no longer exists')
  figma.currentPage.selection = [node as SceneNode]
  figma.viewport.scrollAndZoomIntoView([node as SceneNode])
}

/** "Select all" on a grouped finding: select every layer that shares the pair. */
async function selectAll(payload: unknown): Promise<{ selected: number }> {
  const { nodeIds } = selectRequestSchema.parse(payload)
  const nodes: SceneNode[] = []
  for (const id of nodeIds) {
    const node = await figma.getNodeByIdAsync(id)
    if (node && node.type !== 'DOCUMENT' && node.type !== 'PAGE') nodes.push(node as SceneNode)
  }
  if (!nodes.length) throw new Error('None of those layers still exist')
  figma.currentPage.selection = nodes
  figma.viewport.scrollAndZoomIntoView(nodes)
  return { selected: nodes.length }
}

/** Bind the suggested token on every layer that shares the finding. */
async function applyFix(payload: unknown): Promise<{ applied: number }> {
  const { nodeIds, variableId } = applyFixRequestSchema.parse(payload)
  const variable = await figma.variables.getVariableByIdAsync(variableId)
  if (!variable) throw new Error('That variable no longer exists')

  let applied = 0
  for (const id of nodeIds) {
    const node = await figma.getNodeByIdAsync(id)
    if (!node || !('fills' in node)) continue
    const fills = (node as SceneNode & { fills: readonly Paint[] }).fills
    if (fills === figma.mixed || !fills.length) continue
    // The scan measured the topmost visible paint, so that is the one to rebind.
    const next = [...fills]
    let top = next.length - 1
    while (top > 0 && next[top]!.visible === false) top -= 1
    const paint = next[top]!
    if (paint.type !== 'SOLID') continue
    next[top] = figma.variables.setBoundVariableForPaint(paint, 'color', variable)
    ;(node as SceneNode & { fills: readonly Paint[] }).fills = next
    applied += 1
  }
  if (!applied) throw new Error('No layer could take that token')
  return { applied }
}

/**
 * Write the finding into Figma's own Dev Mode annotations.
 *
 * Plugin-drawn overlays live in design mode and are invisible or buried in Dev
 * Mode, which is where developers read a spec — so this uses `node.annotations`
 * rather than drawing anything on the canvas.
 */
async function annotate(payload: unknown): Promise<{ annotated: number }> {
  const { nodeIds, label } = annotateRequestSchema.parse(payload)
  let annotated = 0
  for (const id of nodeIds) {
    const node = await figma.getNodeByIdAsync(id)
    if (!node || !('annotations' in node)) continue
    const target = node as SceneNode & { annotations: readonly Annotation[] }
    const existing = target.annotations.filter((a) => !a.label?.startsWith('WCAG '))
    target.annotations = [...existing, { label }]
    annotated += 1
  }
  if (!annotated) throw new Error('Those layers cannot carry a Dev Mode annotation')
  return { annotated }
}

/** Ready to scan: what a scan of the scope would read. Null when the scope is the selection and nothing is selected. */
async function target(payload: unknown): Promise<ScanTarget | null> {
  const { scope } = targetRequestSchema.parse(payload)
  const page = figma.currentPage
  const roots = scope === 'page' ? page.children : page.selection
  if (scope === 'selection' && !roots.length) return null
  return summarizeScope(scope, roots, page.name)
}

/** Mark a finding as not a finding. Recorded in the document, so the team shares the correction. */
function ignore(payload: unknown): { at: string } {
  const { key } = ignoreRequestSchema.parse(payload)
  const at = new Date().toISOString()
  writeIgnores(withIgnore(readIgnores(), key, at))
  return { at }
}

function unignore(payload: unknown): { restored: number } {
  const { key } = ignoreRequestSchema.parse(payload)
  const before = readIgnores()
  const after = withoutIgnore(before, key)
  writeIgnores(after)
  return { restored: before.length - after.length }
}

export const handlers: HandlerMap = {
  [MSG.scan]: scan,
  [MSG.ignore]: ignore,
  [MSG.unignore]: unignore,
  [MSG.target]: target,
  [MSG.openRules]: (payload: unknown) => { figma.openExternal(quickrefUrl(openRulesRequestSchema.parse(payload ?? {}).standard)) },
  [MSG.focus]: focus,
  [MSG.selectAll]: selectAll,
  [MSG.applyFix]: applyFix,
  [MSG.annotate]: annotate,
  [MSG.createReport]: createReport,
  [MSG.createSpec]: createSpec,
}
