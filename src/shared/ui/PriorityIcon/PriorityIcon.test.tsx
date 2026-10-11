import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { PriorityIcon } from './PriorityIcon'

describe('PriorityIcon', () => {
  it('defaults to Highest and names itself', () => {
    const { container } = render(<PriorityIcon />)
    expect(container.querySelector('.bb-priority-icon')?.getAttribute('data-priority')).toBe('highest')
    expect(screen.getByRole('img', { name: 'Highest priority' })).toBeInTheDocument()
  })
  it('maps the Figma Priority variant to data-priority and its chevrons', () => {
    const { container } = render(<PriorityIcon priority="medium" />)
    expect(container.querySelector('.bb-priority-icon')?.getAttribute('data-priority')).toBe('medium')
    expect(container.querySelector('path')?.getAttribute('d')).toBe('M4 6.5H12M4 9.5H12')
  })
  it('accepts a custom accessible label', () => {
    render(<PriorityIcon priority="low" label="P4" />)
    expect(screen.getByRole('img', { name: 'P4' })).toBeInTheDocument()
  })
})
