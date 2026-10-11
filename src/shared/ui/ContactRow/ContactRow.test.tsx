import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { ContactRow } from './ContactRow'

describe('ContactRow', () => {
  it('renders the Figma copy with a mailto link', () => {
    render(<ContactRow />)
    expect(screen.getByText('Need access or lost your code? Contact the Design Systems team.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'designsystems@hcltech.com' })).toHaveAttribute('href', 'mailto:designsystems@hcltech.com')
  })
  it('links the channel only when it has a target', () => {
    const { rerender } = render(<ContactRow />)
    expect(screen.queryByRole('link', { name: 'Teams · #design-studio' })).toBeNull()
    rerender(<ContactRow channelHref="https://teams.example/design-studio" />)
    expect(screen.getByRole('link', { name: 'Teams · #design-studio' })).toHaveAttribute('href', 'https://teams.example/design-studio')
  })
})
