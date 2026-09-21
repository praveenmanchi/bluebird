import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { SelectField } from './SelectField'

describe('SelectField', () => {
  it('renders a listbox trigger button showing the value', () => {
    render(<SelectField value="Colours" />)
    const button = screen.getByRole('button', { name: 'Colours' })
    expect(button.getAttribute('aria-haspopup')).toBe('listbox')
    expect(button.getAttribute('aria-expanded')).toBe('false')
  })
  it('labels the trigger through a real <label> when label is given', () => {
    render(<SelectField label="Label Title" value="Colours" labelIcon="variables" />)
    expect(screen.getByLabelText('Label Title').tagName).toBe('BUTTON')
    expect(document.querySelector('.bb-select-field__label-icon')).not.toBeNull()
  })
  it('shows the placeholder when there is no value', () => {
    render(<SelectField placeholder="Select" />)
    expect(screen.getByText('Select').hasAttribute('data-placeholder')).toBe(true)
  })
  it('reflects open, hover state and disabled on the root', () => {
    const { container, rerender } = render(<SelectField open state="hover" />)
    const root = container.firstElementChild as HTMLElement
    expect(root.dataset.open).toBe('true')
    expect(root.dataset.state).toBe('hover')
    expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('true')
    rerender(<SelectField disabled />)
    expect(screen.getByRole('button')).toBeDisabled()
    expect((container.firstElementChild as HTMLElement).hasAttribute('data-disabled')).toBe(true)
  })
  it('calls onClick and renders hidden layers only when asked', () => {
    const onClick = vi.fn()
    const { container, rerender } = render(<SelectField onClick={onClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(container.querySelector('.bb-select-field__helper')).toBeNull()
    rerender(<SelectField helper="Input bottom label" revealIcon />)
    expect(container.querySelector('.bb-select-field__helper')?.textContent).toBe('Input bottom label')
    expect(container.querySelector('.bb-select-field__eye')).not.toBeNull()
  })
})
