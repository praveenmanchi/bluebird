import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { ChangeStatus } from './ChangeStatus'

describe('ChangeStatus', () => {
  it('defaults to "Updated" with a zero count', () => {
    render(<ChangeStatus />)
    const root = screen.getByText('Updated').closest('.bb-change-status') as HTMLElement
    expect(root.dataset.status).toBe('updated')
    expect(root.querySelector('.bb-change-status__count')?.textContent).toBe('0')
  })
  it('maps the Figma variants to captions and data-status', () => {
    const { rerender } = render(<ChangeStatus status="added" count={12} />)
    expect(screen.getByText('Added').closest('.bb-change-status')?.getAttribute('data-status')).toBe('added')
    expect(screen.getByText('12')).toBeInTheDocument()
    rerender(<ChangeStatus status="removed" count={3} />)
    expect(screen.getByText('Removed').closest('.bb-change-status')?.getAttribute('data-status')).toBe('removed')
  })
  it('accepts a custom caption and spreads attributes', () => {
    render(<ChangeStatus status="updated" count={1} label="Changed" data-testid="cs" />)
    expect(screen.getByTestId('cs')).toHaveTextContent('Changed')
    expect(screen.queryByText('Updated')).toBeNull()
  })
})
