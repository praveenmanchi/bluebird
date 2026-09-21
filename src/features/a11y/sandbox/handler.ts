// Runs inside Figma. Everything that touches the document for this tab lives here.
import type { HandlerMap, HandlerContext } from '@shared/bridge'
import { traverse, scopeRoots } from '@shared/figma/traverse'
import { solidFill, effectiveBackground } from '@shared/figma/paint'
import { blendOver, contrastRatio, rgbaToHex } from '@shared/figma/color'
import { isBoldStyle, rateContrast, roundRatio } from '../contrast'
import { MSG, scanRequestSchema, focusRequestSchema, type ContrastIssue, type ScanResult, type ScanProgress } from '../messages'

async function scan(payload: unknown, ctx: HandlerContext): Promise<ScanResult> {
  const { scope } = scanRequestSchema.parse(payload)
  const started = Date.now()
  const roots = scopeRoots(scope)
  const textNodes: TextNode[] = []

  figma.skipInvisibleInstanceChildren = true
  const scanned = await traverse(
    roots,
    (node) => { if (node.type === 'TEXT' && node.visible) textNodes.push(node) },
    { onProgress: (visited) => ctx.emit(MSG.progress, { visited } satisfies ScanProgress) },
  )

  const issues: ContrastIssue[] = []
  for (const node of textNodes) {
    const issue = evaluateText(node)
    if (issue) issues.push(issue)
  }
  issues.sort((a, b) => a.ratio - b.ratio)

  return { scope, scanned, textNodes: textNodes.length, issues, durationMs: Date.now() - started }
}

function evaluateText(node: TextNode): ContrastIssue | null {
  const fill = solidFill(node)
  if (!fill) return null
  const background = effectiveBackground(node)
  const foreground = blendOver(fill, background)
  const ratio = contrastRatio(foreground, background)
  const fontSize = typeof node.fontSize === 'number' ? node.fontSize : 0
  const fontName = node.fontName !== figma.mixed ? node.fontName : null
  const isBold = isBoldStyle(fontName?.style ?? '', typeof node.fontWeight === 'number' ? node.fontWeight : undefined)
  const level = rateContrast(ratio, fontSize, isBold)
  if (level === 'aaa') return null
  return {
    nodeId: node.id,
    name: node.name,
    text: node.characters.slice(0, 60),
    fontSize,
    isBold,
    foreground: rgbaToHex(foreground),
    background: rgbaToHex(background),
    ratio: roundRatio(ratio),
    level,
  }
}

async function focus(payload: unknown): Promise<void> {
  const { nodeId } = focusRequestSchema.parse(payload)
  const node = await figma.getNodeByIdAsync(nodeId)
  if (!node || node.type === 'DOCUMENT' || node.type === 'PAGE') throw new Error('Layer no longer exists')
  figma.currentPage.selection = [node as SceneNode]
  figma.viewport.scrollAndZoomIntoView([node as SceneNode])
}

export const handlers: HandlerMap = {
  [MSG.scan]: scan,
  [MSG.focus]: focus,
}
