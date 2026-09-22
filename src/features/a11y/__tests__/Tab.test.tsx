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
    await waitFor(() => expect(screen.getByText('3 below AAA')).toBeInTheDocument(), { timeout: 3000 })
    expect(screen.getByText('1 fail AA')).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(3)
    expect(screen.getByText('Last synced 2 minutes ago')).toBeInTheDocument()
  })

  it('filters cards by level and scans only the selection by default', async () => {
    renderTab()
    fireEvent.click(screen.getByRole('button', { name: 'Scan' }))
    await waitFor(() => expect(screen.getByText('1 below AAA')).toBeInTheDocument(), { timeout: 3000 })
    fireEvent.click(screen.getByRole('button', { name: 'Level' }))
    fireEvent.click(screen.getByRole('option', { name: /Level AAA/ }))
    expect(screen.queryAllByRole('article')).toHaveLength(0)
  })
})
