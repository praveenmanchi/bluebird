import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { RuleRow } from './RuleRow'

describe('RuleRow', () => {
  it('renders the Figma defaults: checked rule, name, description, AA level', () => {
    const { container } = render(<RuleRow />)
    expect(screen.getByText('1.4.3 Contrast (minimum)')).toBeInTheDocument()
    expect(screen.getByText('Text 4.5:1, large text 3:1, checked in every brand mode')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: '1.4.3 Contrast (minimum)' })).toBeChecked()
    expect(container.querySelector('.bb-rating')).toHaveAttribute('data-rating', 'AA')
    expect(container.querySelector('.bb-rule-row')).toHaveAttribute('data-enabled', 'true')
  })
  it('reflects a disabled rule and another level', () => {
    const { container } = render(<RuleRow enabled={false} level="AAA" />)
    expect(screen.getByRole('checkbox')).not.toBeChecked()
    expect(container.querySelector('.bb-rule-row')).toHaveAttribute('data-enabled', 'false')
    expect(container.querySelector('.bb-rating')).toHaveAttribute('data-rating', 'AAA')
  })
  it('fires onToggle with the next value through the composed Checkbox', () => {
    const onToggle = vi.fn()
    render(<RuleRow enabled={false} onToggle={onToggle} />)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(onToggle).toHaveBeenCalledWith(true)
  })
  it('falls back to a generic accessible name when the name is markup', () => {
    render(<RuleRow name={<strong>2.4.7</strong>} />)
    expect(screen.getByRole('checkbox', { name: 'Enable rule' })).toBeInTheDocument()
  })
})
