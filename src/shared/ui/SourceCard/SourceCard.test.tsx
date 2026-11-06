import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { SourceCard } from './SourceCard'

describe('SourceCard', () => {
  it('renders the Figma defaults: name, meta, Variables glyph, Indexed badge and a checked Include', () => {
    const { container } = render(<SourceCard />)
    expect(screen.getByText('Brand UI variables')).toBeInTheDocument()
    expect(screen.getByText('Variables · 1,026 tokens · 8 brand modes')).toBeInTheDocument()
    expect(container.querySelector('.bb-source-card__type [data-icon]')?.getAttribute('data-icon')).toBe('variables')
    expect(screen.getByText('Indexed').closest('.bb-meta-badge')?.getAttribute('data-tone')).toBe('success')
    expect(screen.getByRole('checkbox', { name: 'Include Brand UI variables' })).toBeChecked()
    expect(container.querySelector('.bb-source-card')?.getAttribute('data-selected')).toBe('true')
  })
  it('reports toggles through onToggle', () => {
    const onToggle = vi.fn()
    render(<SourceCard name="Type scale.md" selected={false} onToggle={onToggle} />)
    const box = screen.getByRole('checkbox', { name: 'Include Type scale.md' })
    expect(box).not.toBeChecked()
    fireEvent.click(box)
    expect(onToggle).toHaveBeenCalledWith(true)
  })
  it('passes the status override to the Meta Badge', () => {
    render(<SourceCard status="Indexing" statusTone="warning" />)
    expect(screen.getByText('Indexing').closest('.bb-meta-badge')?.getAttribute('data-tone')).toBe('warning')
  })
})
