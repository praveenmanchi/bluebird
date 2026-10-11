import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { Avatar } from './Avatar'

describe('Avatar', () => {
  it('defaults to Size=Small with the Figma initials', () => {
    const { container } = render(<Avatar />)
    expect(container.querySelector('.bb-avatar')?.getAttribute('data-size')).toBe('sm')
    expect(screen.getByText('PM')).toBeInTheDocument()
  })
  it('maps Size=Medium to data-size="md"', () => {
    const { container } = render(<Avatar size="md">AK</Avatar>)
    expect(container.querySelector('.bb-avatar')?.getAttribute('data-size')).toBe('md')
  })
  it('uses the full name as the accessible name when given', () => {
    render(<Avatar name="Anika Kumar">AK</Avatar>)
    expect(screen.getByRole('img', { name: 'Anika Kumar' })).toBeInTheDocument()
  })
})
