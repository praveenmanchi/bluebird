import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { Stepper, stepState } from './Stepper'

const states = (c: Element) => [...c.querySelectorAll('.bb-step')].map((s) => s.getAttribute('data-state'))

describe('Stepper', () => {
  it('defaults to the Figma composition: Select ✓, Check ✓, Generate (current), Ship', () => {
    const { container } = render(<Stepper />)
    const list = screen.getByRole('list')
    expect(list.tagName).toBe('OL')
    expect(screen.getAllByRole('listitem')).toHaveLength(4)
    expect(states(container)).toEqual(['done', 'done', 'current', 'upcoming'])
    expect(screen.getByText('Generate').closest('.bb-step')?.getAttribute('aria-current')).toBe('step')
    expect(container.querySelector('[data-state="upcoming"] .bb-step__index')?.textContent).toBe('4')
  })
  it('draws one connector between each pair of steps, hidden from assistive tech', () => {
    const { container } = render(<Stepper />)
    const connectors = container.querySelectorAll('.bb-stepper__connector')
    expect(connectors).toHaveLength(3)
    connectors.forEach((c) => expect(c.getAttribute('aria-hidden')).toBe('true'))
  })
  it('takes a custom steps array and current index', () => {
    const { container } = render(<Stepper steps={[{ label: 'A' }, { label: 'B', number: 'β' }]} current={0} />)
    expect(states(container)).toEqual(['current', 'upcoming'])
    expect(container.querySelector('[data-state="upcoming"] .bb-step__index')?.textContent).toBe('β')
  })
  it('stepState maps position against current', () => {
    expect([0, 1, 2, 3].map((i) => stepState(i, 2))).toEqual(['done', 'done', 'current', 'upcoming'])
    expect([0, 1].map((i) => stepState(i, 5))).toEqual(['done', 'done'])
  })
})
