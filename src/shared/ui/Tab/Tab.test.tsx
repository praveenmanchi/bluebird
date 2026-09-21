import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { Tab } from './Tab'

describe('Tab', () => {
  it('renders a tab with its label and default icon', () => {
    render(<Tab>Variables</Tab>)
    const tab = screen.getByRole('tab', { name: 'Variables' })
    expect(tab.dataset.variant).toBe('default')
    expect(tab.getAttribute('aria-selected')).toBe('false')
    expect(tab.querySelector('[data-icon="variables"]')).not.toBeNull()
  })
  it('marks the Active variant as selected', () => {
    render(<Tab variant="active">Variables</Tab>)
    expect(screen.getByRole('tab').getAttribute('aria-selected')).toBe('true')
  })
  it('hides the icon with showIcon=false and swaps it through icon', () => {
    const { container, rerender } = render(<Tab showIcon={false}>x</Tab>)
    expect(container.querySelector('.bb-tab__icon')).toBeNull()
    rerender(<Tab icon="uxai">x</Tab>)
    expect(container.querySelector('[data-icon="uxai"]')).not.toBeNull()
  })
  it('Variant3 is icon-only but keeps an accessible name; Variant 3 text reveals the label', () => {
    const { container, rerender } = render(<Tab variant="variant3" icon="uxai">UXAI</Tab>)
    expect(container.querySelector('.bb-tab__label')).toBeNull()
    expect(screen.getByRole('tab', { name: 'UXAI' })).toBeTruthy()
    rerender(<Tab variant="variant3" icon="uxai" showVariant3Text>UXAI</Tab>)
    expect(container.querySelector('.bb-tab__label')?.textContent).toBe('UXAI')
  })
  it('calls onClick and respects disabled', () => {
    const onClick = vi.fn()
    const { rerender } = render(<Tab onClick={onClick}>x</Tab>)
    fireEvent.click(screen.getByRole('tab'))
    expect(onClick).toHaveBeenCalledTimes(1)
    rerender(<Tab onClick={onClick} disabled>x</Tab>)
    expect(screen.getByRole('tab')).toBeDisabled()
  })
})
