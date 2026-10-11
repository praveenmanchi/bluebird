import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/preact'
import { TextArea } from './TextArea'

describe('TextArea', () => {
  it('labels a native textarea and describes it with the helper', () => {
    render(<TextArea label="Custom Instructions (optional)" helperText="Included in every prompt." placeholder="Add any custom instructions…" />)
    const field = screen.getByLabelText('Custom Instructions (optional)') as HTMLTextAreaElement
    expect(field.tagName).toBe('TEXTAREA')
    expect(field.placeholder).toBe('Add any custom instructions…')
    expect(field).toHaveAccessibleDescription('Included in every prompt.')
  })

  it('hides the label and helper when they are omitted (Show label / Show helper off)', () => {
    const { container } = render(<TextArea aria-label="Notes" />)
    expect(container.querySelector('.bb-text-area__label')).toBeNull()
    expect(container.querySelector('.bb-text-area__helper')).toBeNull()
    expect(screen.getByLabelText('Notes')).not.toHaveAttribute('aria-describedby')
  })

  it('reports typing', () => {
    const onValueChange = vi.fn()
    render(<TextArea label="Notes" onValueChange={onValueChange} />)
    fireEvent.input(screen.getByLabelText('Notes'), { target: { value: 'Prefer semantic tokens' } })
    expect(onValueChange).toHaveBeenCalledWith('Prefer semantic tokens')
  })

  it('shows the controlled value', () => {
    render(<TextArea label="Notes" value="Prefer semantic tokens" />)
    expect((screen.getByLabelText('Notes') as HTMLTextAreaElement).value).toBe('Prefer semantic tokens')
  })

  it('disables the field and marks the root (State=Disabled)', () => {
    const { container } = render(<TextArea label="Notes" disabled />)
    expect(screen.getByLabelText('Notes')).toBeDisabled()
    expect(container.querySelector('.bb-text-area')).toHaveAttribute('data-disabled', 'true')
  })

  it('forces the focus visual for stories (State=Focused)', () => {
    const { container } = render(<TextArea label="Notes" state="focused" />)
    expect(container.querySelector('.bb-text-area')).toHaveAttribute('data-state', 'focused')
  })
})
