import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { Chip } from './Chip'

describe('Chip', () => {
  it('renders a button with the Figma Text and the Variables glyph by default', () => {
    const { container } = render(<Chip>Colors</Chip>)
    expect(screen.getByRole('button', { name: 'Colors' })).toBeInTheDocument()
    expect(container.querySelector('.bb-icon[data-icon="variables"]')).not.toBeNull()
  })
  it('hides the icon when Figma "Icon" is off and swaps the glyph through icon', () => {
    const { container, rerender } = render(<Chip showIcon={false} />)
    expect(container.querySelector('.bb-chip__icon')).toBeNull()
    rerender(<Chip icon="file" />)
    expect(container.querySelector('.bb-icon[data-icon="file"]')).not.toBeNull()
  })
  it('reports selected through aria-pressed and data-selected', () => {
    render(<Chip selected>Sel</Chip>)
    const btn = screen.getByRole('button', { name: 'Sel' })
    expect(btn).toHaveAttribute('aria-pressed', 'true')
    expect(btn).toHaveAttribute('data-selected')
  })
  it('fires onClick and respects disabled', () => {
    const onClick = vi.fn()
    const { rerender } = render(<Chip onClick={onClick}>a</Chip>)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
    rerender(<Chip onClick={onClick} disabled>a</Chip>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
