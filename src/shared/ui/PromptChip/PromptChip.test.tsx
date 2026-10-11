import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { PromptChip } from './PromptChip'

describe('PromptChip', () => {
  it('renders the Figma default as a button with the colors glyph', () => {
    const { container } = render(<PromptChip />)
    const button = screen.getByRole('button', { name: 'What is our primary colour?' })
    expect(button.getAttribute('type')).toBe('button')
    expect(container.querySelector('[data-icon]')?.getAttribute('data-icon')).toBe('colors')
  })
  it('fires onClick and honours an icon swap', () => {
    const onClick = vi.fn()
    const { container } = render(<PromptChip icon="text" onClick={onClick}>Type scale?</PromptChip>)
    fireEvent.click(screen.getByRole('button', { name: 'Type scale?' }))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(container.querySelector('[data-icon]')?.getAttribute('data-icon')).toBe('text')
  })
  it('passes disabled through and exposes the forced hover state', () => {
    render(<PromptChip disabled state="hover" />)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button.getAttribute('data-state')).toBe('hover')
  })
})
