import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { IssueType } from './IssueType'

describe('IssueType', () => {
  it('defaults to Story and names itself for assistive tech', () => {
    const { container } = render(<IssueType />)
    expect(container.querySelector('.bb-issue-type')?.getAttribute('data-type')).toBe('story')
    expect(screen.getByRole('img', { name: 'Story' })).toBeInTheDocument()
  })
  it('maps each Figma Type to data-type and a fill or stroke glyph', () => {
    const cases = [['bug', 'fill'], ['task', 'stroke'], ['epic', 'fill'], ['subtask', 'stroke']] as const
    for (const [type, paint] of cases) {
      const { container, unmount } = render(<IssueType type={type} />)
      expect(container.querySelector('.bb-issue-type')?.getAttribute('data-type')).toBe(type)
      expect(container.querySelector('svg')?.getAttribute('data-paint')).toBe(paint)
      unmount()
    }
  })
  it('accepts a custom accessible label', () => {
    render(<IssueType type="bug" label="Bug issue" />)
    expect(screen.getByRole('img', { name: 'Bug issue' })).toBeInTheDocument()
  })
})
