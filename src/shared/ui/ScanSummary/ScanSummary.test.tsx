import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { ScanSummary, type ScanSummaryProps } from './ScanSummary'

const props: ScanSummaryProps = {
  score: 50,
  meterScore: '2 / 4',
  kpis: [
    { label: 'Components', value: '4', icon: 'component' },
    { label: 'Passing', value: '2', tone: 'success', icon: 'status-good' },
  ],
  levels: [{ name: 'Atoms', passing: 2, total: 2 }],
  principles: [{ tone: 'perceivable', label: 'Perceivable', value: 3 }],
  severity: [{ tone: 'critical', label: 'Critical', value: 1 }],
  brands: [{ brand: 'Bridge', count: 2 }],
}

describe('ScanSummary', () => {
  it('starts collapsed: only the score shows; KPIs and breakdowns wait behind Show details', () => {
    render(<ScanSummary {...props} />)
    expect(screen.getByText('50%')).toBeVisible()
    expect(screen.getByText('Components').closest('[hidden]')).not.toBeNull()
    const toggle = screen.getByRole('button', { name: /Show details/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText('By principle').closest('[hidden]')).not.toBeNull()
  })

  it('expands and collapses from the Show / Hide details toggle', () => {
    const onToggle = vi.fn()
    render(<ScanSummary {...props} onToggle={onToggle} />)
    fireEvent.click(screen.getByRole('button', { name: /Show details/ }))
    expect(onToggle).toHaveBeenCalledWith(true)
    const hide = screen.getByRole('button', { name: /Hide details/ })
    expect(hide).toHaveAttribute('aria-expanded', 'true')
    expect(document.getElementById(hide.getAttribute('aria-controls')!)).not.toHaveAttribute('hidden')
    expect(screen.getByText('Atoms')).toBeVisible()
  })

  it('honours a controlled expanded prop', () => {
    render(<ScanSummary {...props} expanded />)
    expect(screen.getByRole('button', { name: /Hide details/ })).toBeInTheDocument()
  })

  it('leaves out the component-level and brand blocks when they are not given', () => {
    render(<ScanSummary {...props} levels={undefined} brands={[]} defaultExpanded />)
    expect(screen.queryByText('By component level')).toBeNull()
    expect(screen.queryByText('Findings by brand mode')).toBeNull()
  })

  it('shows a dash rather than 0% when there is nothing to score', () => {
    render(<ScanSummary {...props} score={null} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})
