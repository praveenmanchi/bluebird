import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { SectionTitle } from './SectionTitle'

describe('SectionTitle', () => {
  it('renders the Figma default heading, neutral count and action', () => {
    render(<SectionTitle />)
    expect(screen.getByRole('heading', { name: 'Figma links' })).toBeInTheDocument()
    expect(screen.getByText('2').closest('.bb-meta-badge')?.getAttribute('data-tone')).toBe('neutral')
    expect(screen.getByRole('button', { name: 'Attach link' })).toBeInTheDocument()
  })
  it('honours Show count and Show action', () => {
    const { container } = render(<SectionTitle showCount={false} showAction={false} />)
    expect(container.querySelector('.bb-meta-badge')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })
  it('calls onAction from the link button', () => {
    const onAction = vi.fn()
    render(<SectionTitle actionLabel="Add" onAction={onAction} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(onAction).toHaveBeenCalledTimes(1)
  })
})
