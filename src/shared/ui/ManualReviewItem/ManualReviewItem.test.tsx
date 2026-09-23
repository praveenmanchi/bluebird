import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { ManualReviewItem } from './ManualReviewItem'

describe('ManualReviewItem', () => {
  it('pairs the discipline indicator with a labelled checkbox', () => {
    const { container } = render(<ManualReviewItem kind="design" label="Focus ring reaches 3:1" />)
    expect(container.querySelector('.bb-disability-indicator')?.getAttribute('data-kind')).toBe('design')
    expect(screen.getByRole('checkbox', { name: 'Focus ring reaches 3:1' })).toBeInTheDocument()
  })
  it('maps the Figma Done variant to data-done', () => {
    const { container } = render(<ManualReviewItem kind="code" label="Checked" done />)
    expect(container.querySelector('.bb-manual-review-item')?.getAttribute('data-done')).toBe('true')
  })
  it('is read-only without onToggle, and reports the new state with it', () => {
    const calls: boolean[] = []
    const { rerender } = render(<ManualReviewItem kind="content" label="Alt text" />)
    expect(screen.getByRole('checkbox', { name: 'Alt text' })).toBeDisabled()
    rerender(<ManualReviewItem kind="content" label="Alt text" onToggle={(d) => calls.push(d)} />)
    screen.getByRole('checkbox', { name: 'Alt text' }).click()
    expect(calls).toEqual([true])
  })
})
