import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { PersonaCard } from './PersonaCard'

describe('PersonaCard', () => {
  it('renders the Team Name, Team Description and the persona illustration', () => {
    const { container } = render(<PersonaCard name="Design System" description="Pick a role" footnote="Note" />)
    expect(screen.getByRole('heading', { name: 'Design System' })).toBeInTheDocument()
    expect(screen.getByText('Pick a role')).toHaveClass('bb-persona-card__description')
    expect(screen.getByText('Note')).toHaveClass('bb-persona-card__footnote')
    const img = container.querySelector('img.bb-persona-card__image') as HTMLImageElement
    expect(img.getAttribute('src')).toMatch(/persona-userpic-05/)
  })
  it('lets image override the illustration src', () => {
    const { container } = render(<PersonaCard name="x" image="/custom.png" />)
    expect(container.querySelector('img.bb-persona-card__image')).toHaveAttribute('src', '/custom.png')
  })
  it('composes the five compact Tab instances by default and accepts a custom list', () => {
    const { rerender } = render(<PersonaCard name="x" />)
    expect(screen.getAllByRole('tab')).toHaveLength(5)
    expect(screen.getByRole('tab', { name: 'Variable Search' })).toHaveAttribute('data-variant', 'variant3')
    rerender(<PersonaCard name="x" tabs={[{ label: 'Inspect', icon: 'inspect' }]} />)
    expect(screen.getAllByRole('tab')).toHaveLength(1)
    rerender(<PersonaCard name="x" tabs={[]} />)
    expect(screen.queryByRole('tablist')).toBeNull()
  })
  it('composes the primary Button and fires onOpen', () => {
    const onOpen = vi.fn()
    render(<PersonaCard name="x" actionLabel="Change the persona" onOpen={onOpen} />)
    const button = screen.getByRole('button', { name: 'Change the persona' })
    expect(button).toHaveAttribute('data-variant', 'primary')
    fireEvent.click(button)
    expect(onOpen).toHaveBeenCalledTimes(1)
  })
})
