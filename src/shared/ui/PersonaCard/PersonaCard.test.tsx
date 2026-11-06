import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { render, screen, fireEvent } from '@testing-library/preact'
import { PersonaCard } from './PersonaCard'

// Vitest blanks CSS imports, so the stylesheet and the generated tokens are read from disk.
const here = dirname(fileURLToPath(import.meta.url))
const css = readFileSync(resolve(here, 'PersonaCard.css'), 'utf8')

describe('PersonaCard', () => {
  it('renders the Team Name, Team Description and the persona illustration', () => {
    const { container } = render(<PersonaCard name="Design System" description="Pick a role" footnote="Note" image="/persona-userpic-05.png" />)
    expect(screen.getByRole('heading', { name: 'Design System' })).toBeInTheDocument()
    expect(screen.getByText('Pick a role')).toHaveClass('bb-persona-card__description')
    expect(screen.getByText('Note')).toHaveClass('bb-persona-card__footnote')
    const img = container.querySelector('img.bb-persona-card__image') as HTMLImageElement
    expect(img.getAttribute('src')).toMatch(/persona-userpic-05/)
  })
  it('sizes the description from its own Figma layer (10px / 12px), not the 11px footnote that shares its name', () => {
    const rule = /\.bb-persona-card__description \{[^}]*\}/.exec(css)?.[0] ?? ''
    expect(rule).toContain('font-size: var(--bb-font-size-caption);')
    expect(rule).toContain('line-height: var(--bb-type-line-12);')
    const footnote = /\.bb-persona-card__footnote \{[^}]*\}/.exec(css)?.[0] ?? ''
    expect(footnote).toContain('font-size: var(--bb-font-size-body);')
    expect(footnote).toContain('line-height: var(--bb-type-line-17-6);')
  })
  it('lets image override the illustration src', () => {
    const { container } = render(<PersonaCard name="x" image="/custom.png" />)
    expect(container.querySelector('img.bb-persona-card__image')).toHaveAttribute('src', '/custom.png')
  })
  it('lets media replace the illustration', () => {
    const { container } = render(<PersonaCard name="x" media={<span data-testid="live" />} />)
    expect(screen.getByTestId('live')).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
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
