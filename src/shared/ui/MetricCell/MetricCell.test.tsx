import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { MetricCell } from './MetricCell'

describe('MetricCell', () => {
  it('renders the label above the value', () => {
    const { container } = render(<MetricCell label="Line height">16px (1.23)</MetricCell>)
    expect(screen.getByText('Line height')).toHaveClass('bb-metric-cell__label')
    expect(container.querySelector('.bb-metric-cell__value')?.textContent).toBe('16px (1.23)')
  })
})
