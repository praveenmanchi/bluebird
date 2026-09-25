import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { Thumbnail } from './Thumbnail'

describe('Thumbnail', () => {
  it('renders the image with its alt text and a default caption', () => {
    render(<Thumbnail src="before.png" alt="Label as drawn today" />)
    expect(screen.getByRole('img', { name: 'Label as drawn today' })).toHaveAttribute('src', 'before.png')
    expect(screen.getByText('Before')).toBeInTheDocument()
  })
  it('takes a caption override', () => {
    render(<Thumbnail src="after.png" alt="fixed" caption="After the fix" />)
    expect(screen.getByText('After the fix')).toBeInTheDocument()
  })
})
