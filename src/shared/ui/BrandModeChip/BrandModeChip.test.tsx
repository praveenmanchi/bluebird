import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { BrandModeChip } from './BrandModeChip'

describe('BrandModeChip', () => {
  it('defaults to failing and exposes no data-pass', () => {
    const { container } = render(<BrandModeChip brand="Bridge" />)
    const chip = container.querySelector('.bb-brand-mode-chip')
    expect(chip?.getAttribute('data-pass')).toBeNull()
    expect(screen.getByText('Bridge')).toBeInTheDocument()
  })
  it('maps the Figma State and Current variants to data attributes', () => {
    const { container } = render(<BrandModeChip brand="Ikea" pass current ratio="7.1:1" />)
    const chip = container.querySelector('.bb-brand-mode-chip')
    expect(chip?.getAttribute('data-pass')).toBe('true')
    expect(chip?.getAttribute('data-current')).toBe('true')
    expect(screen.getByText('7.1:1')).toBeInTheDocument()
  })
  it('hides the ratio when it is not supplied', () => {
    const { container } = render(<BrandModeChip brand="Disney" />)
    expect(container.querySelector('.bb-brand-mode-chip__ratio')).toBeNull()
  })
})
