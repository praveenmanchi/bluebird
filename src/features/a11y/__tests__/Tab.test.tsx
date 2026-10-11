import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/preact'
import { RpcProvider } from '@shared/ui'
import { createRpcClient, createMockTransport } from '@shared/bridge'
import { Tab } from '../ui/Tab'
import { mockHandlers } from '../mock'
import { MSG, type ScanTarget } from '../messages'
import type { HandlerMap } from '@shared/bridge'

function renderTab(handlers: HandlerMap = mockHandlers) {
  const client = createRpcClient(createMockTransport(handlers, 0))
  return render(<RpcProvider client={client}><Tab /></RpcProvider>)
}

const PAGE: ScanTarget = { scope: 'page', name: 'Main screens', selected: 12, frames: 12, textLayers: 1840, instances: 412, truncated: false }

/** Nothing selected in Figma: Ready to scan falls back to the page, and so does the scan. */
const nothingSelected = (): HandlerMap => ({ ...mockHandlers, [MSG.target]: async (p: { scope: string }) => (p.scope === 'page' ? PAGE : null) })

describe('a11y Tab', () => {
  it('shows the Figma toolbar and an empty canvas before scanning', () => {
    renderTab()
    expect(screen.getByRole('button', { name: 'Platform' })).toHaveTextContent('Web')
    expect(screen.getByRole('button', { name: 'Standard' })).toHaveTextContent('WCAG 2.2')
    expect(screen.getByRole('button', { name: 'Level' })).toHaveTextContent('Level: All')
    expect(screen.queryByRole('status')).toBeNull()
    // Figma Ready to scan: what the scan will read, the principles and the rules it checks.
    const ready = screen.getByRole('region', { name: 'Ready to scan' })
    expect(ready).toHaveTextContent('What we check')
    expect(screen.getAllByRole('checkbox')).toHaveLength(5)
    expect(screen.queryByText('Not scanned yet')).toBeNull()
  })

  it('checks touch targets against the chosen platform’s minimum', async () => {
    renderTab(nothingSelected())
    await screen.findByRole('heading', { name: 'Ready to check Main screens' })
    fireEvent.click(screen.getByRole('button', { name: 'Platform' }))
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Web', 'iOS', 'Android'])
    fireEvent.click(screen.getByRole('option', { name: 'iOS' }))
    // The rules list swaps the enhanced target row for Apple's own minimum.
    expect(screen.getByText('iOS target size (Apple HIG)')).toBeInTheDocument()
    expect(screen.getByText('44×44 pt tap target')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Scan' }))
    await waitFor(() => expect(screen.getByRole('tab', { name: /Target size 2/ })).toBeInTheDocument(), { timeout: 3000 })
    // 16×16 still fails 2.5.8; 32×20 fails it too (its smallest side is 20), both measured against 44 pt.
    expect(screen.getAllByText('44 × 44 pt (Apple HIG)')).toHaveLength(2)
  })

  it('tells you the whole page will be read when nothing is selected', async () => {
    renderTab(nothingSelected())
    expect(await screen.findByText(/Nothing is selected, so the scan reads the whole page/)).toBeInTheDocument()
  })

  it('names the selection and what a scan will read', async () => {
    renderTab()
    expect(await screen.findByRole('heading', { name: 'Ready to check Login screen' })).toBeInTheDocument()
    expect(screen.getByText(/1 frame selected · 214 text layers · 38 component instances\. One scan reads every brand mode/)).toBeInTheDocument()
    for (const p of ['Perceivable', 'Operable', 'Understandable', 'Robust']) expect(screen.getByText(p)).toBeInTheDocument()
  })

  it('has no scan buttons of its own, and an unticked rule hides its findings', async () => {
    renderTab(nothingSelected())
    expect(screen.queryByRole('button', { name: 'Scan selection' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Scan whole page' })).toBeNull()
    fireEvent.click(screen.getByRole('checkbox', { name: /1\.4\.11 Non-text contrast/ }))
    expect(screen.getByRole('region', { name: 'Ready to scan' })).toHaveTextContent('What we check4')
    await screen.findByRole('heading', { name: 'Ready to check Main screens' })
    fireEvent.click(screen.getByRole('button', { name: 'Scan' }))
    await waitFor(() => expect(screen.getByRole('region', { name: 'Findings' })).toBeInTheDocument())
    expect(screen.queryByRole('region', { name: 'Ready to scan' })).toBeNull()
    // The fixture's one non-text finding is hidden with 1.4.11 unticked: 3 contrast + 2 target size.
    expect(screen.getByRole('tab', { name: /Non-text 0/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /All 5/ })).toBeInTheDocument()
  })

  it('scans the whole page when nothing is selected and renders each finding as a WCAG card', async () => {
    renderTab(nothingSelected())
    await screen.findByRole('heading', { name: 'Ready to check Main screens' })
    fireEvent.click(screen.getByRole('button', { name: 'Scan' }))
    // 3 contrast + 1 non-text + 2 target-size findings from the fixture.
    await waitFor(() => expect(screen.getByText('1 fail AA')).toBeInTheDocument(), { timeout: 3000 })
    expect(screen.getByRole('heading', { name: 'Findings' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'All 6' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getAllByRole('article')).toHaveLength(6)
    expect(screen.getByText('Last synced 2 minutes ago')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Non-text Contrast' })).toBeInTheDocument()
    // Both fixture targets miss the 24px bar, so both render as 2.5.8.
    expect(screen.getAllByRole('heading', { name: 'Target Size (Minimum)' })).toHaveLength(2)
  })

  it('filters cards by level and scans only the selection by default', async () => {
    renderTab()
    fireEvent.click(screen.getByRole('button', { name: 'Scan' }))
    // Selection scope trims the contrast list to one; the other criteria stay.
    await waitFor(() => expect(screen.getByRole('tab', { name: 'All 4' })).toBeInTheDocument(), { timeout: 3000 })
    fireEvent.click(screen.getByRole('button', { name: 'Level' }))
    fireEvent.click(screen.getByRole('option', { name: /Level AAA/ }))
    // Nothing in the fixture misses AAA only: 1.4.11 is AA-only and both
    // targets miss the AA bar, so an AAA filter empties the canvas.
    expect(screen.queryAllByRole('article')).toHaveLength(0)
  })

  it('fills the Scan Summary from the scan and filters cards by kind', async () => {
    renderTab(nothingSelected())
    await screen.findByRole('heading', { name: 'Ready to check Main screens' })
    fireEvent.click(screen.getByRole('button', { name: 'Scan' }))
    await waitFor(() => expect(screen.getByRole('tab', { name: 'All 6' })).toBeInTheDocument(), { timeout: 3000 })
    // 12 components in the fixture, 4 of them failing → 67%.
    expect(screen.getByText('67%', { selector: '.bb-score-value__score' })).toBeInTheDocument()
    expect(screen.getByText('8 / 12')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Show details/ }))
    expect(screen.getByText('By component level')).toBeVisible()
    fireEvent.click(screen.getByRole('tab', { name: 'Target size 2' }))
    expect(screen.getAllByRole('article')).toHaveLength(2)
  })
})
