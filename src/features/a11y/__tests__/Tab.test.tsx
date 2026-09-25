import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/preact'
import { RpcProvider } from '@shared/ui'
import { createRpcClient, createMockTransport } from '@shared/bridge'
import { Tab } from '../ui/Tab'
import { mockHandlers } from '../mock'

function renderTab() {
  const client = createRpcClient(createMockTransport(mockHandlers, 0))
  return render(<RpcProvider client={client}><Tab /></RpcProvider>)
}

describe('a11y Tab', () => {
  it('shows the Figma toolbar and an empty canvas before scanning', () => {
    renderTab()
    expect(screen.getByRole('button', { name: 'Scope' })).toHaveTextContent('Selection')
    expect(screen.getByRole('button', { name: 'Standard' })).toHaveTextContent('WCAG 2.2')
    expect(screen.getByRole('button', { name: 'Level' })).toHaveTextContent('Level: All')
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('scans the whole page and renders each finding as a WCAG card', async () => {
    renderTab()
    fireEvent.click(screen.getByRole('button', { name: 'Scope' }))
    fireEvent.click(screen.getByRole('option', { name: /Whole page/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Scan' }))
    // 3 contrast + 1 non-text + 2 target-size findings from the fixture.
    await waitFor(() => expect(screen.getByText('6 findings')).toBeInTheDocument(), { timeout: 3000 })
    expect(screen.getByText('1 fail AA')).toBeInTheDocument()
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
    await waitFor(() => expect(screen.getByText('4 findings')).toBeInTheDocument(), { timeout: 3000 })
    fireEvent.click(screen.getByRole('button', { name: 'Level' }))
    fireEvent.click(screen.getByRole('option', { name: /Level AAA/ }))
    // Nothing in the fixture misses AAA only: 1.4.11 is AA-only and both
    // targets miss the AA bar, so an AAA filter empties the canvas.
    expect(screen.queryAllByRole('article')).toHaveLength(0)
  })
})
