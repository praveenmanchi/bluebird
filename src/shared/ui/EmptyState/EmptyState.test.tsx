import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('renders title, description and an optional glyph as a status region', () => {
    render(<EmptyState icon="inspect" title="Nothing here" description="Try a scan." />)
    const region = screen.getByRole('status')
    expect(region).toHaveTextContent('Nothing here')
    expect(region).toHaveTextContent('Try a scan.')
    expect(region.querySelector('[data-icon="inspect"]')).not.toBeNull()
  })
})
