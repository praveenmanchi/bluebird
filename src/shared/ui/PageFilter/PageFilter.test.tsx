import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { PageFilter } from './PageFilter'

describe('PageFilter', () => {
  it('is a popup trigger showing the file glyph, label and chevron', () => {
    const { container } = render(<PageFilter />)
    const btn = screen.getByRole('button', { name: 'All Pages' })
    expect(btn).toHaveAttribute('aria-haspopup', 'listbox')
    expect(btn).toHaveAttribute('aria-expanded', 'false')
    expect(container.querySelector('.bb-icon[data-icon="file"]')).not.toBeNull()
    expect(container.querySelector('.bb-icon[data-icon="chevron-tiny"]')).not.toBeNull()
  })
  it('reflects open through aria-expanded and data-open', () => {
    render(<PageFilter open label="Page 1" />)
    const btn = screen.getByRole('button', { name: 'Page 1' })
    expect(btn).toHaveAttribute('aria-expanded', 'true')
    expect(btn).toHaveAttribute('data-open')
  })
  it('fires onClick and respects disabled', () => {
    const onClick = vi.fn()
    const { rerender } = render(<PageFilter onClick={onClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
    rerender(<PageFilter onClick={onClick} disabled />)
    expect(screen.getByRole('button')).toBeDisabled()
  })
  it('forces the hover look through data-state', () => {
    render(<PageFilter state="hover" />)
    expect(screen.getByRole('button')).toHaveAttribute('data-state', 'hover')
  })
})
