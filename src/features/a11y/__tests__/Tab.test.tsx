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
  it('starts empty and shows results after a scan', async () => {
    renderTab()
    expect(screen.getByText('Nothing scanned yet')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Whole page' }))
    fireEvent.click(screen.getByRole('button', { name: 'Scan' }))
    await waitFor(() => expect(screen.getByText('3 below AAA')).toBeInTheDocument(), { timeout: 3000 })
    expect(screen.getByText('1 fail AA')).toBeInTheDocument()
    expect(screen.getByText('Last synced 2 minutes ago')).toBeInTheDocument()
  })

  it('scans only the selection by default', async () => {
    renderTab()
    fireEvent.click(screen.getByRole('button', { name: 'Scan' }))
    await waitFor(() => expect(screen.getByText('1 below AAA')).toBeInTheDocument(), { timeout: 3000 })
  })
})
