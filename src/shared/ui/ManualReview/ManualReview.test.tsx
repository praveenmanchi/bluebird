import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { ManualReview } from './ManualReview'

const CHECKS = [
  { kind: 'content' as const, label: 'Alt text conveys the same meaning', done: true },
  { kind: 'design' as const, label: 'Focus ring is visible at 3:1' },
  { kind: 'code' as const, label: 'Colour is not the only signal' },
]

describe('ManualReview', () => {
  it('lists one item per check and counts the done ones', () => {
    const { container } = render(<ManualReview checks={CHECKS} />)
    expect(container.querySelectorAll('.bb-manual-review-item')).toHaveLength(3)
    expect(screen.getByText('1/3')).toBeInTheDocument()
  })
  it('reports the index and new state of a toggled check', () => {
    const calls: [number, boolean][] = []
    render(<ManualReview checks={CHECKS} onToggle={(i, done) => calls.push([i, done])} />)
    screen.getByRole('checkbox', { name: 'Focus ring is visible at 3:1' }).click()
    expect(calls).toEqual([[1, true]])
  })
  it('takes label and count overrides', () => {
    render(<ManualReview checks={CHECKS} label="Still to check" count="all done" />)
    expect(screen.getByText('Still to check')).toBeInTheDocument()
    expect(screen.getByText('all done')).toBeInTheDocument()
  })
})
