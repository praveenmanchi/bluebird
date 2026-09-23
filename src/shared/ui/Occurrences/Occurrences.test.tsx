import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { Occurrences } from './Occurrences'

describe('Occurrences', () => {
  it('draws the multiplication sign itself so callers pass a plain count', () => {
    render(<Occurrences count={37} />)
    expect(screen.getByText('×37')).toBeInTheDocument()
    expect(screen.getByText('affected layers')).toBeInTheDocument()
  })
  it('omits the action when there is nothing to select', () => {
    render(<Occurrences count={2} />)
    expect(screen.queryByRole('button')).toBeNull()
  })
  it('fires onSelectAll', () => {
    const calls: string[] = []
    render(<Occurrences count={37} onSelectAll={() => calls.push('all')} />)
    screen.getByRole('button', { name: 'Select all' }).click()
    expect(calls).toEqual(['all'])
  })
})
