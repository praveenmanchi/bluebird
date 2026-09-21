import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { ButtonGroup } from './ButtonGroup'
import { Button } from '../Button/Button'

describe('ButtonGroup', () => {
  it('renders Secondary then Primary inside a group, like the Figma Container', () => {
    render(<ButtonGroup />)
    const buttons = screen.getAllByRole('button')
    expect(screen.getByRole('group')).toBeInTheDocument()
    expect(buttons.map((b) => b.dataset.variant)).toEqual(['secondary', 'primary'])
    expect(buttons.map((b) => b.textContent)).toEqual(['Test Connection', 'Save Configuration'])
  })
  it('forwards the primary and secondary handlers', () => {
    const onPrimary = vi.fn()
    const onSecondary = vi.fn()
    render(<ButtonGroup primaryLabel="Save" secondaryLabel="Test" onPrimary={onPrimary} onSecondary={onSecondary} />)
    fireEvent.click(screen.getByRole('button', { name: 'Test' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSecondary).toHaveBeenCalledOnce()
    expect(onPrimary).toHaveBeenCalledOnce()
  })
  it('disables and marks busy per action', () => {
    render(<ButtonGroup primaryLoading secondaryDisabled />)
    const [secondary, primary] = screen.getAllByRole('button')
    expect(secondary).toBeDisabled()
    expect(primary).toBeDisabled()
    expect(primary?.getAttribute('aria-busy')).toBe('true')
  })
  it('accepts custom children instead of the default pair', () => {
    render(<ButtonGroup><Button>Only</Button></ButtonGroup>)
    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Only' })).toBeInTheDocument()
  })
})
