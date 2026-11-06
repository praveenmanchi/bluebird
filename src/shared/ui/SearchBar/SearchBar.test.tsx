import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { SearchBar } from './SearchBar'

describe('SearchBar', () => {
  it('renders a search landmark with a labelled search input and the search glyph', () => {
    const { container } = render(<SearchBar value="" />)
    expect(screen.getByRole('search')).toBeInTheDocument()
    const input = screen.getByRole('searchbox', { name: 'Search' })
    expect(input.getAttribute('placeholder')).toBe('Search variables')
    expect(container.querySelector('[data-icon="search"]')).not.toBeNull()
  })
  it('reports typing and Enter', () => {
    const onValueChange = vi.fn()
    const onSubmit = vi.fn()
    render(<SearchBar value="" onValueChange={onValueChange} onSubmit={onSubmit} />)
    const input = screen.getByRole('searchbox')
    fireEvent.input(input, { target: { value: 'tok' } })
    expect(onValueChange).toHaveBeenCalledWith('tok')
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSubmit).toHaveBeenCalledWith('tok')
  })
  it('honours disabled and custom labels', () => {
    render(<SearchBar value="" disabled label="Find variables" />)
    const input = screen.getByRole('searchbox', { name: 'Find variables' })
    expect(input).toBeDisabled()
    expect(screen.getByRole('search').hasAttribute('data-disabled')).toBe(true)
  })
})
