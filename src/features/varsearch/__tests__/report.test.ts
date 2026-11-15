import { describe, it, expect } from 'vitest'
import { buildReport, figmaLink, formatStamp, reportText } from '../report'
import { searchReportSchema } from '../reportSchema'
import type { SearchResult } from '../messages'

const result: SearchResult = {
  query: '/default',
  matched: 14,
  scannedPages: 19,
  visited: 12000,
  durationMs: 840,
  fileKey: 'FILE123',
  variables: [
    {
      id: 'v1', name: 'dropdown/border/default', collection: 'Brand UI', resolvedType: 'COLOR', modes: 8, textLike: false, totalNodes: 11,
      usages: [
        { id: '1:2', name: 'Tab sub menu', kind: 'component', pageId: 'p1', pageName: 'Molecules', nodeIds: ['a', 'b'], count: 5 },
        { id: '3:4', name: 'Dropdown', kind: 'component', pageId: 'p2', pageName: 'Organisms', nodeIds: ['c'], count: 1 },
      ],
    },
    {
      id: 'v2', name: 'font/family-ui', collection: 'Brand UI', resolvedType: 'STRING', modes: 8, textLike: true, totalNodes: 2,
      usages: [{ id: 'S:1', name: 'Body', kind: 'text-style', pageId: '', pageName: '', nodeIds: [], count: 2 }],
    },
  ],
}
const at = new Date(2026, 10, 15, 16, 20)

describe('variable search report', () => {
  it('stamps the time the way the report shows it', () => {
    expect(formatStamp(at)).toBe('15 Nov 2026, 16:20')
  })

  it('links a node in the file, and nothing without a file key', () => {
    expect(figmaLink('FILE123', '40002378:50041')).toBe('https://www.figma.com/design/FILE123?node-id=40002378-50041')
    expect(figmaLink(null, '1:2')).toBeNull()
  })

  it('builds one report for the whole search, with a section per variable', () => {
    const report = buildReport(result, { scope: 'All pages', types: 'All types', at })
    expect(report.frameName).toBe('Variable search report · /default')
    expect(report.title).toBe('“/default”')
    expect(report.details).toEqual([
      ['Search', '2 of 14 variables named like this are in use'],
      ['Scope', 'All pages · All types · 19 pages'],
      ['Found', '2 variables · 3 places · 13 nodes'],
      ['Last updated', '15 Nov 2026, 16:20'],
    ])
    expect(report.totals.map((t) => [t.value, t.label])).toEqual([['2', 'Variables'], ['3', 'Places using them'], ['13', 'Nodes bound'], ['19', 'Pages scanned']])
    expect(report.sections.map((s) => s.name)).toEqual(['dropdown/border/default', 'font/family-ui'])
    expect(report.sections[0]!.rows[0]).toEqual({ name: 'Tab sub menu', kind: 'Component', page: 'Molecules', nodes: 5, nodeId: '1:2' })
    // Text styles are not on the canvas: no page, no link.
    expect(report.sections[1]!.rows[0]).toMatchObject({ kind: 'Text style', page: 'Text styles', nodeId: null })
    expect(searchReportSchema.safeParse(report).success).toBe(true)
  })

  it('copies as plain text that pastes cleanly into Jira or Teams', () => {
    const text = reportText(buildReport(result, { scope: 'All pages', types: 'All types', at }))
    expect(text).toBe([
      'Variable search: “/default”',
      '2 variables · 3 places · 13 nodes · 19 pages scanned · 15 Nov 2026, 16:20',
      '',
      'dropdown/border/default (Brand UI, colour) — 2 components, 11 nodes',
      '- Tab sub menu (Molecules) · 5 nodes · https://www.figma.com/design/FILE123?node-id=1-2',
      '- Dropdown (Organisms) · 1 node · https://www.figma.com/design/FILE123?node-id=3-4',
      '',
      'font/family-ui (Brand UI, text) — 1 text style, 2 nodes',
      '- Body (Text styles) · 2 nodes',
      '',
      'From Bluebird Variable search.',
    ].join('\n'))
  })
})
