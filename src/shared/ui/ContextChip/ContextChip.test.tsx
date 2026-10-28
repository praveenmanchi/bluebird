import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { ContextChip } from './ContextChip'

describe('ContextChip', () => {
  it('defaults to the Selection variant and its glyph', () => {
    const { container } = render(<ContextChip />)
    const chip = container.querySelector('.bb-context-chip')!
    expect(chip.getAttribute('data-type')).toBe('selection')
    expect(chip.querySelector('[data-icon]')?.getAttribute('data-icon')).toBe('component-select')
  })
  it('swaps the glyph per Figma Type', () => {
    const { container, rerender } = render(<ContextChip type="source">Vars</ContextChip>)
    expect(container.querySelector('[data-icon]')?.getAttribute('data-icon')).toBe('ui-sidebar-libraries')
    rerender(<ContextChip type="citation">Doc</ContextChip>)
    expect(container.querySelector('[data-icon]')?.getAttribute('data-icon')).toBe('text')
  })
  it('renders the label and honours an icon override', () => {
    const { container } = render(<ContextChip type="source" icon="jira">PROJ-12</ContextChip>)
    expect(screen.getByText('PROJ-12')).toBeInTheDocument()
    expect(container.querySelector('[data-icon]')?.getAttribute('data-icon')).toBe('jira')
  })
})
