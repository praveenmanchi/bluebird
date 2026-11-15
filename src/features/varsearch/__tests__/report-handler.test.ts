import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { HandlerContext } from '@shared/bridge'
import { installFigmaMock } from '../../../../tests/mocks/figma'
import { MSG, type SearchResult } from '../messages'
import { buildReport, type ReportResult } from '../report'

const drawReport = vi.fn(async (report: { frameName: string }): Promise<ReportResult> => ({ frameName: report.frameName, page: 'Molecules' }))
vi.mock('../sandbox/report-canvas', () => ({ drawReport: (r: { frameName: string }) => drawReport(r) }))
const { handlers } = await import('../sandbox/handler')

const result: SearchResult = {
  query: 'border/default', matched: 1, scannedPages: 3, visited: 100, durationMs: 20, fileKey: 'K',
  variables: [{ id: 'v', name: 'dropdown/border/default', collection: 'Brand UI', resolvedType: 'COLOR', modes: 8, textLike: false, totalNodes: 5,
    usages: [{ id: '1:2', name: 'Tab sub menu', kind: 'component', pageId: 'p', pageName: 'Molecules', nodeIds: ['a'], count: 5 }] }],
}
const call = (payload: unknown) => (handlers[MSG.report] as (p: unknown, c: HandlerContext) => Promise<ReportResult>)(payload, {} as HandlerContext)

describe('varsearch report handler', () => {
  beforeEach(() => { installFigmaMock(); drawReport.mockClear() })

  it('draws a valid report and says where it went', async () => {
    const report = buildReport(result, { scope: 'All pages', types: 'All types', at: new Date(2026, 10, 15, 16, 20) })
    await expect(call({ report })).resolves.toEqual({ frameName: 'Variable search report · border/default', page: 'Molecules' })
    expect(drawReport).toHaveBeenCalledOnce()
  })

  it('refuses a malformed report before drawing anything', async () => {
    await expect(call({ report: { query: 'x' } })).rejects.toThrow()
    expect(drawReport).not.toHaveBeenCalled()
  })
})
