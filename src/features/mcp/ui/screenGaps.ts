import { scaleGaps } from '../../../shared/brand/scaleGaps'

// Shared reasons for the MCP v2 step screens' figma.ts files. Every step body in
// Figma ("MCP flow v2 · 600") is the same shell — Stepper, mcp/* cards, Actions
// bar — around composed design-system instances, so most bindings and raw
// geometry are consumed elsewhere: the shell tokens by McpHandoff.css, instance
// bindings by the instance's own component CSS.

export const composed = (component: string): string => `Bound on the composed ${component} instance; ${component}'s own CSS consumes it.`

export const SHELL = 'Read once in McpHandoff.css — the shared body, card and Actions-bar styles every MCP step renders inside.'

/** Raw-geometry reasons for --bb-derived-<step>-* tokens. */
export const DERIVED = {
  root: 'The 600×616 body frame; the shell’s <main> sizes the body inside the 360–760 plugin window.',
  fill: 'FILL in Figma; code gives the element the full width of its card or row (width: 100% / flex).',
  hug: 'Hugs its content in Figma; the instance sizes itself from its label.',
  height: 'Instance height; the composed component sizes itself.',
  stroke: 'Stroke weight is bound per side to mcp/border-width in Figma, which the extractor does not record (it only reads a whole-node strokeWeight binding). Cards read --bb-mcp-border-width in McpHandoff.css; instances draw their own border.',
  segment: 'Raw Tab selecters override on the composed SegmentTab; SegmentTab.css reads the same values through --bb-derived-segment-tab-*.',
  disabled: 'Disabled Button instance; Button.css applies the disabled look.',
  snippet: 'HUG of the code shown; the snippet grows with the file.',
} as const

const SHELL_TOKENS = new Set([
  'mcp/font/family', 'mcp/font/line-caption', 'mcp/font/size-caption', 'mcp/font/weight-regular',
  'mcp/radius/panel', 'mcp/space/inline', 'mcp/space/panel', 'mcp/space/section', 'mcp/space/tight',
  'mcp/surface/panel', 'mcp/surface/panel-border', 'mcp/text/meta', 'mcp/border-width',
])

const PREFIXES: ReadonlyArray<readonly [string, string]> = [
  ['button/', 'Button'],
  ['checkbox/', 'Checkbox'],
  ['dropdown/', 'Dropdown'],
  ['input/', 'Input'],
  ['jira/', 'FigmaLinkCard / TicketRow'],
  ['login/', 'Notice'],
  ['border/subtle', 'CodeSnippet'],
  ['radius/lg', 'CodeSnippet'],
  ['mcp/space/row-', 'ConnectionRow'],
  ['mcp/surface/field', 'ConnectionRow'],
  ['mcp/radius/control', 'ConnectionRow'],
]

/** Bindings read by another step's stylesheet that owns the shared element. */
const READ_ELSEWHERE: Readonly<Record<string, string>> = {
  'mcp/space/hair': 'Read in ShipPushing.css, which styles the shared Ship steps list (Pushing, PR link, Push rejected).',
}

/** Shared scale variables: the step reads a same-value mcp/* token or leaves the layer to a child. */
const SCALE = /^(border-width|space|radius|font|type|dimension)\//

/** figmaGaps for the named bindings. Throws on one with no known home, so a new binding still needs a decision. */
export function bindingGaps(names: readonly string[]): Record<string, string> {
  return Object.fromEntries(names.map((name) => {
    if (SHELL_TOKENS.has(name)) return [name, SHELL]
    if (READ_ELSEWHERE[name]) return [name, READ_ELSEWHERE[name]]
    const hit = PREFIXES.find(([prefix]) => name.startsWith(prefix))
    if (!hit && SCALE.test(name)) return [name, scaleGaps(name)[name]!]
    if (!hit) throw new Error(`No figmaGaps reason for "${name}" — read it in the step's CSS or add a reason in screenGaps.ts`)
    return [name, composed(hit[1])]
  }))
}
