import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/preact'
import { RpcProvider } from '@shared/ui'
import { createRpcClient, createMockTransport } from '@shared/bridge'
import { Tab } from '../ui/Tab'
import { createMockHandlers } from '../mock'

function renderTab(scenario: 'default' | 'clean' = 'default') {
  const client = createRpcClient(createMockTransport(createMockHandlers(scenario), 0))
  return render(<RpcProvider client={client}><Tab /></RpcProvider>)
}

describe('tokens Tab', () => {
  it('offers both scopes and an Audit button before anything has run', () => {
    renderTab()
    expect(screen.getByRole('button', { name: 'Whole page' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Selection' })).toBeInTheDocument()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('leads with the coverage figure and lists both kinds of drift', async () => {
    renderTab()
    fireEvent.click(screen.getByRole('button', { name: 'Audit' }))
    await waitFor(() => expect(screen.getByText('87%')).toBeInTheDocument(), { timeout: 3000 })
    expect(screen.getByRole('heading', { name: 'Colours not bound to a variable' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Spacing off the scale' })).toBeInTheDocument()
    expect(screen.getByText('#FAFAFA')).toBeInTheDocument()
    expect(screen.getByText('nearest on scale: 9')).toBeInTheDocument()
  })

  it('names the variable that already holds an unbound value', async () => {
    renderTab()
    fireEvent.click(screen.getByRole('button', { name: 'Audit' }))
    await waitFor(() => expect(screen.getByText('Brand/Surface/Canvas')).toBeInTheDocument(), { timeout: 3000 })
    expect(screen.getByText('no variable holds this value')).toBeInTheDocument()
  })

  it('offers Select all only where a finding spans several layers', async () => {
    renderTab()
    fireEvent.click(screen.getByRole('button', { name: 'Audit' }))
    await waitFor(() => expect(screen.getByText('87%')).toBeInTheDocument(), { timeout: 3000 })
    expect(screen.getAllByRole('button', { name: 'Select all' })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: 'Select' })).toHaveLength(2)
  })

  it('says so plainly when nothing has drifted', async () => {
    renderTab('clean')
    fireEvent.click(screen.getByRole('button', { name: 'Audit' }))
    await waitFor(() => expect(screen.getByText('100%')).toBeInTheDocument(), { timeout: 3000 })
    expect(screen.getByText(/comes from the system/)).toBeInTheDocument()
  })
})
