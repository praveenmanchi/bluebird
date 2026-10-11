import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { KpiTile } from './KpiTile'
import { DisclosureToggle } from '../DisclosureToggle/DisclosureToggle'
import { BreakdownCard } from '../BreakdownCard/BreakdownCard'

describe('KpiTile', () => {
  it('renders value, label and caption, with the icon unless hidden', () => {
    const { container, rerender } = render(<KpiTile label="Passing" value="26" caption="68%" icon="status-good" />)
    expect(screen.getByText('26')).toBeInTheDocument()
    expect(container.querySelector('[data-icon="status-good"]')).toBeInTheDocument()
    rerender(<KpiTile label="Passing" value="26" showIcon={false} />)
    expect(container.querySelector('.bb-kpi-tile__icon')).toBeNull()
  })
})

describe('DisclosureToggle', () => {
  it('reports the next state and flips its label', () => {
    let next: boolean | undefined
    const { rerender } = render(<DisclosureToggle onToggle={(v) => { next = v }} />)
    screen.getByRole('button', { name: /Show details/ }).click()
    expect(next).toBe(true)
    rerender(<DisclosureToggle expanded />)
    expect(screen.getByRole('button', { name: /Hide details/ })).toHaveAttribute('aria-expanded', 'true')
  })
})

describe('BreakdownCard', () => {
  it('renders one row per entry under its title', () => {
    const { container } = render(<BreakdownCard title="By severity" rows={[{ tone: 'critical', label: 'Critical', value: 9 }, { tone: 'minor', label: 'Minor', value: 0 }]} />)
    expect(screen.getByRole('heading', { name: 'By severity' })).toBeInTheDocument()
    expect(container.querySelectorAll('.bb-breakdown-row')).toHaveLength(2)
  })
})
