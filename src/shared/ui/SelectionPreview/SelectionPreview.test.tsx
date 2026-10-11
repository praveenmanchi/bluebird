import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { SelectionPreview } from './SelectionPreview'

describe('SelectionPreview', () => {
  it('renders the Figma defaults: name, meta, three stats and a Ticket Row thumbnail', () => {
    const { container } = render(<SelectionPreview />)
    expect(screen.getByText('Ticket Row')).toBeInTheDocument()
    expect(screen.getByText('Component · State=Selected · Components › Jira')).toBeInTheDocument()
    expect(container.querySelectorAll('.bb-selection-preview__stats .bb-meta-badge')).toHaveLength(3)
    expect(container.querySelector('.bb-selection-preview__thumb .bb-ticket-row')).not.toBeNull()
  })
  it('keeps the thumbnail out of the tab order and the accessibility tree', () => {
    const { container } = render(<SelectionPreview />)
    expect(container.querySelector('.bb-selection-preview__preview')?.getAttribute('aria-hidden')).toBe('true')
  })
  it('accepts a custom thumbnail and stats', () => {
    render(<SelectionPreview stats={[{ label: '2 raw values', tone: 'warning' }]}><span>thumb</span></SelectionPreview>)
    expect(screen.getByText('thumb')).toBeInTheDocument()
    expect(screen.getByText('2 raw values').closest('.bb-meta-badge')?.getAttribute('data-tone')).toBe('warning')
  })
  it('calls onSelectOnCanvas from the link button', () => {
    const onSelect = vi.fn()
    render(<SelectionPreview onSelectOnCanvas={onSelect} />)
    fireEvent.click(screen.getByRole('button', { name: 'Select on canvas' }))
    expect(onSelect).toHaveBeenCalledOnce()
  })
})
