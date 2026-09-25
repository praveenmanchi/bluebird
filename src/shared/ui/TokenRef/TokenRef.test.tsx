import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { TokenRef } from './TokenRef'

describe('TokenRef', () => {
  it('renders the variable path', () => {
    render(<TokenRef name="Brand/Text/Secondary" />)
    expect(screen.getByText('Brand/Text/Secondary')).toBeInTheDocument()
  })
  it('shows the mode pill only when a mode is given, and titles the whole chip', () => {
    const { container, rerender } = render(<TokenRef name="Brand/Text/Secondary" />)
    expect(container.querySelector('.bb-token-ref__mode')).toBeNull()
    expect(container.querySelector('.bb-token-ref')?.getAttribute('title')).toBe('Brand/Text/Secondary')
    rerender(<TokenRef name="Brand/Text/Secondary" mode="Bridge" />)
    expect(screen.getByText('Bridge')).toBeInTheDocument()
    expect(container.querySelector('.bb-token-ref')?.getAttribute('title')).toBe('Brand/Text/Secondary · mode Bridge')
  })
})
