import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { Button } from './Button'

describe('Button', () => {
  it('renders the Figma Type as data-variant and the label', () => {
    render(<Button variant="secondary">Save</Button>)
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button.dataset.variant).toBe('secondary')
    expect(button.getAttribute('type')).toBe('button')
  })
  it('defaults to primary and forwards clicks', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Go</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
    expect(screen.getByRole('button').dataset.variant).toBe('primary')
  })
  it('renders leading and trailing icons from the Figma icon set', () => {
    const { container } = render(<Button leadingIcon="variables" trailingIcon="dropdown-down">Pages</Button>)
    const icons = container.querySelectorAll('[data-icon]')
    expect([...icons].map((i) => i.getAttribute('data-icon'))).toEqual(['variables', 'dropdown-down'])
  })
  it('disables and marks busy while loading', () => {
    render(<Button loading>Scanning</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button.getAttribute('aria-busy')).toBe('true')
  })
  it('exposes a forced hover state for visual tests', () => {
    render(<Button state="hover">Hover</Button>)
    expect(screen.getByRole('button').dataset.state).toBe('hover')
  })
})
