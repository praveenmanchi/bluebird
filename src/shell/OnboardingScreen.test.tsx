import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { OnboardingScreen } from './OnboardingScreen'
import type { TourTabChip } from './onboarding/scenes/types'

const TABS: TourTabChip[] = [
  { id: 'a11y', label: 'Accessibility', icon: 'accessibility' },
  { id: 'jira', label: 'Jira board', icon: 'jira' },
  { id: 'mcp', label: 'MCP handoff', icon: 'mcp' },
]

const title = () => screen.getByRole('heading', { level: 2 }).textContent

function setup(props: Partial<Parameters<typeof OnboardingScreen>[0]> = {}) {
  const onFinish = vi.fn()
  const view = render(<OnboardingScreen tabs={TABS} onFinish={onFinish} still {...props} />)
  return { onFinish, view, root: screen.getByRole('region', { name: 'Product tour' }) }
}

describe('OnboardingScreen', () => {
  it('opens on Welcome with Back disabled and a counter over every step', () => {
    setup()
    expect(title()).toBe('Welcome to Design Studio')
    expect(screen.getByText('01 / 05')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled()
    expect(screen.getAllByRole('button', { name: /^Step \d of 5/ })).toHaveLength(5)
  })

  it('walks the persona’s tabs in order and ends on Setup with Get started', () => {
    const { onFinish } = setup()
    const next = () => fireEvent.click(screen.getByRole('button', { name: /^(Next|Get started)$/ }))
    next(); expect(title()).toBe('Catch contrast issues before they ship')
    expect(screen.getByRole('button', { name: 'Accessibility' })).toHaveAttribute('aria-current', 'step')
    next(); expect(title()).toBe('Your Jira tickets, next to your designs')
    next(); expect(title()).toBe('Hand off designs straight to code')
    next(); expect(title()).toBe('One last thing — add a key')
    expect(screen.getByRole('button', { name: 'Settings' })).toHaveAttribute('aria-current', 'step')
    fireEvent.click(screen.getByRole('button', { name: 'Get started' }))
    expect(onFinish).toHaveBeenCalledWith(false)
  })

  it('Skip finishes the tour as skipped from any step', () => {
    const { onFinish } = setup({ initialStep: 2 })
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    expect(onFinish).toHaveBeenCalledWith(true)
  })

  it('jumps to a step from its tab or its dot, and goes back', () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'MCP handoff' }))
    expect(title()).toBe('Hand off designs straight to code')
    fireEvent.click(screen.getByRole('button', { name: /^Step 2 of 5/ }))
    expect(title()).toBe('Catch contrast issues before they ship')
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(title()).toBe('Welcome to Design Studio')
  })

  it('moves with the arrow keys and skips with Escape', () => {
    const { onFinish, root } = setup()
    expect(document.activeElement).toBe(root)
    fireEvent.keyDown(root, { key: 'ArrowLeft' })
    expect(title()).toBe('Welcome to Design Studio')
    fireEvent.keyDown(root, { key: 'ArrowRight' })
    fireEvent.keyDown(root, { key: 'ArrowRight' })
    expect(title()).toBe('Your Jira tickets, next to your designs')
    fireEvent.keyDown(root, { key: 'ArrowLeft' })
    expect(title()).toBe('Catch contrast issues before they ship')
    fireEvent.keyDown(root, { key: 'Escape' })
    expect(onFinish).toHaveBeenCalledWith(true)
  })

  it('does not run past the last step with the arrow key', () => {
    setup({ initialStep: 4 })
    fireEvent.keyDown(screen.getByRole('region', { name: 'Product tour' }), { key: 'ArrowRight' })
    expect(title()).toBe('One last thing — add a key')
  })

  it('clamps an out-of-range initial step', () => {
    setup({ initialStep: 99 })
    expect(screen.getByText('05 / 05')).toBeInTheDocument()
  })

  it('shows each step’s demo and leaves the tab list to tabs that have one', () => {
    setup({ tabs: [...TABS, { id: 'changelog', label: 'Changelog', icon: 'variables' }], initialStep: 1 })
    expect(screen.getByRole('img', { name: /accessibility scan finds a contrast issue/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Changelog' })).not.toBeInTheDocument()
    expect(screen.getByText('02 / 05')).toBeInTheDocument()
  })

  it('draws no cursor while frozen on the end state', () => {
    const { view } = setup({ initialStep: 1 })
    expect(view.container.querySelector('.bb-ob-cursor')).toBeNull()
    expect(view.container.querySelector('.bb-ob-still')).not.toBeNull()
  })

  it('keeps keyboard focus in the tour while stepping', () => {
    const { root } = setup()
    const next = screen.getByRole('button', { name: 'Next' })
    next.focus()
    fireEvent.click(next)
    fireEvent.click(next)
    expect(document.activeElement).toBe(next)
    const back = screen.getByRole('button', { name: 'Back' })
    back.focus()
    fireEvent.click(back)
    fireEvent.click(back)
    expect(back).toBeDisabled()
    expect(document.activeElement).toBe(root)
    fireEvent.keyDown(root, { key: 'ArrowRight' })
    expect(title()).toBe('Catch contrast issues before they ship')
  })

  it('keeps one live region and updates its text', () => {
    setup()
    const region = screen.getByRole('heading', { level: 2 }).parentElement
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByRole('heading', { level: 2 }).parentElement).toBe(region)
    expect(region).toHaveAttribute('aria-live', 'polite')
  })

  it('keeps the demo’s buttons out of the tab order', () => {
    const { view } = setup({ initialStep: 1 })
    expect(view.container.querySelector('.bb-ob-stage__inner')).toHaveAttribute('inert')
  })
})

