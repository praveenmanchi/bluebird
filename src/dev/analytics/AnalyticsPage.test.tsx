import { describe, it, expect } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/preact'
import { AnalyticsPage } from './AnalyticsPage'

describe('AnalyticsPage', () => {
  it('labels the numbers as mock data and shows both sections', () => {
    render(<AnalyticsPage />)
    expect(screen.getByText('Mock data')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Plugin usage' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Jira' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Tickets per designer' })).toBeInTheDocument()
  })

  it('switches a chart to its table, so no value needs hovering', () => {
    render(<AnalyticsPage />)
    const card = screen.getByRole('region', { name: 'Most-used features' })
    fireEvent.click(within(card).getByRole('button', { name: 'Table' }))
    expect(within(card).getByRole('columnheader', { name: 'Sessions' })).toBeInTheDocument()
    expect(within(card).getByRole('cell', { name: 'Accessibility' })).toBeInTheDocument()
  })

  it('scopes every number to the filters', () => {
    render(<AnalyticsPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Last 7 days' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Brand' }), { target: { value: 'ibm' } })
    expect(screen.getByRole('button', { name: 'Last 7 days' })).toHaveAttribute('aria-pressed', 'true')
    expect((screen.getByRole('combobox', { name: 'Brand' }) as HTMLSelectElement).value).toBe('ibm')
    expect(screen.getAllByText(/vs previous 7 days/).length).toBeGreaterThan(0)
    const users = screen.getByRole('region', { name: 'Top users' })
    expect(within(users).getAllByRole('cell', { name: 'IBM' }).length).toBeGreaterThan(0)
    expect(within(users).queryByRole('cell', { name: 'Ikea' })).toBeNull()
  })

  it('shows a tooltip with the value when a bar is focused', () => {
    render(<AnalyticsPage />)
    const card = screen.getByRole('region', { name: 'Installs by brand' })
    fireEvent.focus(within(card).getByRole('button', { name: /Bridge/ }))
    expect(within(card).getByRole('status')).toHaveTextContent(/Installs/)
  })

  it('filters the page by clicking a brand bar, and clears it again', () => {
    render(<AnalyticsPage />)
    const card = screen.getByRole('region', { name: 'Installs by brand' })
    fireEvent.click(within(card).getByRole('button', { name: /Microsoft/ }))
    expect((screen.getByRole('combobox', { name: 'Brand' }) as HTMLSelectElement).value).toBe('microsoft')
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect((screen.getByRole('combobox', { name: 'Brand' }) as HTMLSelectElement).value).toBe('all')
  })

  it('hides ticket statuses with the chips and searches the ticket table', () => {
    render(<AnalyticsPage />)
    const card = screen.getByRole('region', { name: 'Time per ticket' })
    fireEvent.click(within(card).getByRole('button', { name: 'Done' }))
    expect(within(card).queryAllByRole('cell', { name: 'Done' })).toHaveLength(0)
    fireEvent.input(within(card).getByRole('searchbox', { name: 'Search tickets' }), { target: { value: 'no such ticket' } })
    expect(within(card).getByText(/No tickets match/)).toBeInTheDocument()
  })
})

