// One report for a whole Variable search: what Copy puts on the clipboard and what
// Add to Figma draws on the canvas (Figma section "Variable search · 600 · Copy and
// Add to Figma" + "Variable search report · /default"). Pure: the UI builds it, the
// sandbox only draws the validated result.
import { KIND_LABEL } from './format'
import type { SearchResult, Usage, UsageKind, VariableMatch } from './messages'

export interface ReportRow {
  name: string
  kind: string
  page: string
  nodes: number
  /** The component / frame to link to; null for text styles, which are not on the canvas. */
  nodeId: string | null
}
export interface ReportSection {
  name: string
  /** "Brand UI · colour · 5 components · 11 nodes" */
  meta: string
  /** "Brand UI, colour" — for the copied text. */
  source: string
  /** "5 components, 11 nodes" — for the copied text. */
  counts: string
  rows: ReportRow[]
}
export interface SearchReport {
  query: string
  frameName: string
  title: string
  /** "Search", "Scope", "Found", "Last updated" — key / value pairs under the title. */
  details: Array<[string, string]>
  totals: Array<{ value: string; label: string; note: string }>
  summary: string
  sections: ReportSection[]
  footer: string
  fileKey: string | null
}
export interface ReportResult {
  frameName: string
  page: string
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const pad = (n: number) => String(n).padStart(2, '0')

/** "15 Nov 2026, 16:20" — the report's Last updated. */
export function formatStamp(at: Date): string {
  return `${at.getDate()} ${MONTHS[at.getMonth()]} ${at.getFullYear()}, ${pad(at.getHours())}:${pad(at.getMinutes())}`
}

/** A link that opens the node in this file, or null when the file key is unknown. */
export function figmaLink(fileKey: string | null | undefined, nodeId: string): string | null {
  return fileKey ? `https://www.figma.com/design/${fileKey}?node-id=${nodeId.replace(/:/g, '-')}` : null
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
const TYPE_LABEL: Readonly<Record<string, string>> = { COLOR: 'colour', FLOAT: 'number', STRING: 'text', BOOLEAN: 'boolean' }
const typeLabel = (t: string) => TYPE_LABEL[t] ?? t.toLowerCase()

/** "2 components, 1 frame" — places by kind, in Figma's order. */
function placesByKind(usages: readonly Usage[]): string {
  const order: UsageKind[] = ['component', 'frame', 'text-style']
  return order.flatMap((k) => {
    const n = usages.filter((u) => u.kind === k).length
    if (!n) return []
    const label = KIND_LABEL[k]
    return [plural(n, label.one.toLowerCase(), label.many)]
  }).join(', ')
}

function section(v: VariableMatch): ReportSection {
  const type = typeLabel(v.resolvedType)
  const places = placesByKind(v.usages)
  const nodes = plural(v.totalNodes, 'node', 'nodes')
  return {
    name: v.name,
    meta: `${v.collection} · ${type} · ${places.replace(/, /g, ' · ')} · ${nodes}`,
    source: `${v.collection}, ${type}`,
    counts: `${places}, ${nodes}`,
    rows: v.usages.map((u) => ({
      name: u.name,
      kind: KIND_LABEL[u.kind].one,
      page: u.kind === 'text-style' || !u.pageName ? 'Text styles' : u.pageName,
      nodes: u.count,
      nodeId: u.kind === 'text-style' ? null : u.id,
    })),
  }
}

export interface ReportOptions {
  /** Pages filter label, e.g. "All pages" or "3 pages". */
  scope: string
  /** Types filter label, e.g. "All types" or "Component". */
  types: string
  at: Date
}

export function buildReport(r: SearchResult, { scope, types, at }: ReportOptions): SearchReport {
  const places = r.variables.reduce((n, v) => n + v.usages.length, 0)
  const nodes = r.variables.reduce((n, v) => n + v.totalNodes, 0)
  const pagesUsed = new Set(r.variables.flatMap((v) => v.usages.filter((u) => u.pageId).map((u) => u.pageId))).size
  const vars = plural(r.variables.length, 'variable', 'variables')
  const stamp = formatStamp(at)
  return {
    query: r.query,
    frameName: `Variable search report · ${r.query}`,
    title: `“${r.query}”`,
    details: [
      ['Search', `${r.variables.length} of ${plural(r.matched, 'variable', 'variables')} named like this ${r.variables.length === 1 ? 'is' : 'are'} in use`],
      ['Scope', `${scope} · ${types} · ${plural(r.scannedPages, 'page', 'pages')}`],
      ['Found', `${vars} · ${plural(places, 'place', 'places')} · ${plural(nodes, 'node', 'nodes')}`],
      ['Last updated', stamp],
    ],
    totals: [
      { value: String(r.variables.length), label: 'Variables', note: `named like “${r.query}”, in use` },
      { value: String(places), label: 'Places using them', note: placesByKind(r.variables.flatMap((v) => v.usages)) },
      { value: String(nodes), label: 'Nodes bound', note: `across ${plural(pagesUsed, 'page', 'pages')}` },
      { value: String(r.scannedPages), label: 'Pages scanned', note: `in ${r.durationMs} ms` },
    ],
    summary: `${vars} · ${plural(places, 'place', 'places')} · ${plural(nodes, 'node', 'nodes')} · ${plural(r.scannedPages, 'page', 'pages')} scanned · ${stamp}`,
    sections: r.variables.map(section),
    footer: `Generated by Bluebird Variable search on ${stamp.replace(', ', ' at ')} · ${plural(r.scannedPages, 'page', 'pages')} scanned in ${r.durationMs} ms. Each “Open” link jumps to that component in this file. Search again in Bluebird to refresh this report.`,
    fileKey: r.fileKey ?? null,
  }
}

/** Plain text for a Jira ticket or a Teams chat: one block per variable, one line per place with a Figma link. */
export function reportText(report: SearchReport): string {
  const lines = [`Variable search: ${report.title}`, report.summary]
  for (const s of report.sections) {
    lines.push('', `${s.name} (${s.source}) — ${s.counts}`)
    for (const row of s.rows) {
      const link = row.nodeId ? figmaLink(report.fileKey, row.nodeId) : null
      lines.push(`- ${row.name} (${row.page}) · ${plural(row.nodes, 'node', 'nodes')}${link ? ` · ${link}` : ''}`)
    }
  }
  lines.push('', 'From Bluebird Variable search.')
  return lines.join('\n')
}
