import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { StoryPoints } from './StoryPoints'

describe('StoryPoints', () => {
  it('renders the Figma default estimate', () => {
    render(<StoryPoints />)
    expect(screen.getByText('5').closest('.bb-story-points')).not.toBeNull()
  })
  it('renders the supplied points and forwards attributes', () => {
    render(<StoryPoints aria-label="8 story points">8</StoryPoints>)
    expect(screen.getByLabelText('8 story points')).toHaveTextContent('8')
  })
})
