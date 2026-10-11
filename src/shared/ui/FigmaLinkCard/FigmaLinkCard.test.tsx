import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { FigmaLinkCard } from './FigmaLinkCard'

describe('FigmaLinkCard', () => {
  it('renders the Figma default frame, path and glyphs', () => {
    const { container } = render(<FigmaLinkCard />)
    expect(screen.getByText('WCAG Card / Mode=colors')).toBeInTheDocument()
    expect(screen.getByText('Plugin UI › Components')).toBeInTheDocument()
    expect(container.querySelector('.bb-figma-link-card__thumb [data-icon="component"]')).not.toBeNull()
    expect(container.querySelector('[data-icon="show"]')).not.toBeNull()
    expect(container.querySelector('[data-icon="copy"]')).not.toBeNull()
  })
  it('renders supplied text', () => {
    render(<FigmaLinkCard frame="Ticket Row" path="Jira › List" />)
    expect(screen.getByText('Ticket Row')).toBeInTheDocument()
    expect(screen.getByText('Jira › List')).toBeInTheDocument()
  })
  it('exposes Open and Copy as named buttons', () => {
    const onOpen = vi.fn()
    const onCopy = vi.fn()
    render(<FigmaLinkCard onOpen={onOpen} onCopy={onCopy} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open in Figma' }))
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }))
    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(onCopy).toHaveBeenCalledTimes(1)
  })
})
