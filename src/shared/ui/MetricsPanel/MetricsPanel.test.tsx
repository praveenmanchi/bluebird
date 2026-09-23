import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { MetricsPanel } from './MetricsPanel'

describe('MetricsPanel', () => {
  it('renders one MetricCell per entry', () => {
    const { container } = render(<MetricsPanel metrics={[
      { label: 'Size', value: '13px' },
      { label: 'Line height', value: '16px (1.23)' },
    ]} />)
    expect(container.querySelectorAll('.bb-metric-cell')).toHaveLength(2)
    expect(screen.getByText('13px')).toBeInTheDocument()
  })
  it('renders an empty panel rather than failing on no metrics', () => {
    const { container } = render(<MetricsPanel metrics={[]} />)
    expect(container.querySelector('.bb-metrics-panel')).toBeInTheDocument()
    expect(container.querySelectorAll('.bb-metric-cell')).toHaveLength(0)
  })
})
