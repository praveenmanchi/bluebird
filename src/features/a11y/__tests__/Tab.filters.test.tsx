// The results on screen are what a scan measured: changing a setting afterwards must say so,
// and a download must hold the same findings the canvas shows.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/preact'
import { RpcProvider } from '@shared/ui'
import { createRpcClient, createMockTransport } from '@shared/bridge'
import { Tab } from '../ui/Tab'
import { mockHandlers } from '../mock'
import { MSG, type ScanTarget } from '../messages'
import type { Report } from '../report'
import type { ScanResult } from '../messages'
import type { HandlerMap } from '@shared/bridge'

const downloads: { name: string; body: string }[] = []
vi.mock('../ui/download', async (original) => ({
  ...(await original<typeof import('../ui/download')>()),
  downloadText: (name: string, body: string) => { downloads.push({ name, body }) },
}))

const PAGE: ScanTarget = { scope: 'page', name: 'Main screens', selected: 12, frames: 12, textLayers: 1840, instances: 412, truncated: false }
const wholePage: HandlerMap = { ...mockHandlers, [MSG.target]: async (p: { scope: string }) => (p.scope === 'page' ? PAGE : null) }

async function scanned() {
  const client = createRpcClient(createMockTransport(wholePage, 0))
  render(<RpcProvider client={client}><Tab /></RpcProvider>)
  await screen.findByRole('heading', { name: 'Ready to check Main screens' })
  fireEvent.click(screen.getByRole('button', { name: 'Scan' }))
  await waitFor(() => expect(screen.getByRole('tab', { name: 'All 6' })).toBeInTheDocument(), { timeout: 3000 })
}

describe('a11y Tab · results and settings', () => {
  beforeEach(() => { downloads.length = 0 })

  it('keeps the results as measured and says so when the Standard moves after a scan', async () => {
    await scanned()
    expect(screen.queryByText(/Scan again to use the new setting/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Standard' }))
    fireEvent.click(screen.getByRole('option', { name: 'WCAG 2.0' }))
    // 2.0 has no non-text or target rules, but nothing was re-measured: the six findings stay.
    expect(screen.getByRole('tab', { name: 'All 6' })).toBeInTheDocument()
    expect(screen.getByText('These results are for WCAG 2.2 on Web. Scan again to use the new setting.')).toBeInTheDocument()
  })

  it('downloads the findings on screen and names the filter', async () => {
    await scanned()
    fireEvent.click(screen.getByRole('button', { name: 'Level' }))
    fireEvent.click(screen.getByRole('option', { name: /Level AAA/ }))
    const shown = screen.queryAllByRole('article').length
    fireEvent.click(screen.getByRole('button', { name: 'Export report' }))
    fireEvent.click(screen.getByRole('option', { name: 'JSON' }))
    await waitFor(() => expect(downloads).toHaveLength(1))
    const report = JSON.parse(downloads[0]!.body) as Report
    expect(report.findings).toHaveLength(shown)
    expect(report.findings.every((f) => f.level === 'AAA')).toBe(true)
    expect(report.meta.filter).toBe('Level AAA only')
  })

  it('moves a corrected finding into Ignored, out of the counts and out of the dashboard', async () => {
    await scanned()
    const shown = screen.getAllByRole('article').length
    expect(screen.getByText('4 fail AA')).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: 'Ignore' })[0]!)
    await waitFor(() => expect(screen.getByRole('region', { name: 'Ignored findings' })).toBeInTheDocument())
    // Still on screen, below the rest, and no longer counted anywhere.
    expect(screen.getAllByRole('article')).toHaveLength(shown)
    expect(screen.getByRole('tab', { name: 'All 5' })).toBeInTheDocument()
    expect(screen.getByText('3 fail AA')).toBeInTheDocument()
    expect(screen.getByText('1 ignored')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Restore' }))
    await waitFor(() => expect(screen.getByRole('tab', { name: 'All 6' })).toBeInTheDocument())
    expect(screen.queryByRole('region', { name: 'Ignored findings' })).toBeNull()
  })

  it('leaves an ignored finding out of the download as well', async () => {
    await scanned()
    fireEvent.click(screen.getAllByRole('button', { name: 'Ignore' })[0]!)
    await waitFor(() => expect(screen.getByRole('tab', { name: 'All 5' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Export report' }))
    fireEvent.click(screen.getByRole('option', { name: 'JSON' }))
    await waitFor(() => expect(downloads).toHaveLength(1))
    expect((JSON.parse(downloads[0]!.body) as Report).findings).toHaveLength(5)
  })

  it('says so when the brand variables could not be read, instead of quietly dropping them', async () => {
    const offline: HandlerMap = {
      ...wholePage,
      [MSG.scan]: async (payload: { scope: 'selection' | 'page' }, ctx) => ({
        ...(await (wholePage[MSG.scan] as (p: unknown, c: unknown) => Promise<ScanResult>)(payload, ctx)),
        paletteError: 'Unable to establish connection to Figma after 10 seconds.',
      }),
    }
    const client = createRpcClient(createMockTransport(offline, 0))
    render(<RpcProvider client={client}><Tab /></RpcProvider>)
    await screen.findByRole('heading', { name: 'Ready to check Main screens' })
    fireEvent.click(screen.getByRole('button', { name: 'Scan' }))
    await waitFor(() => expect(screen.getByText(/variables in this scan/)).toBeInTheDocument(), { timeout: 3000 })
    expect(screen.getByText(/no token names, no per-brand verdicts and no suggested fix/)).toBeInTheDocument()
  })
})
