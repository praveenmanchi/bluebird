import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { SizeStep } from './SizeStep'

describe('SizeStep', () => {
  it('renders the default "L" label unselected', () => {
    const { container } = render(<SizeStep />)
    const root = container.querySelector('.bb-size-step') as HTMLElement
    expect(root.textContent).toBe('L')
    expect(root.hasAttribute('data-selected')).toBe(false)
  })
  it('maps State=active to data-selected and aria-current', () => {
    render(<SizeStep label="M" selected />)
    const root = screen.getByText('M').closest('.bb-size-step') as HTMLElement
    expect(root.dataset.selected).toBe('true')
    expect(root.getAttribute('aria-current')).toBe('true')
  })
  it('spreads extra attributes onto the root', () => {
    render(<SizeStep label="S" title="Small" data-testid="step" />)
    expect(screen.getByTestId('step').getAttribute('title')).toBe('Small')
  })
})
