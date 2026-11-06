import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/preact'
import { PersonaScreen } from './PersonaScreen'

const personas = [
  { id: 'design-system', label: 'Design System', tabs: [{ id: 'tokens', label: 'Design tokens', icon: 'variables' }] },
  { id: 'developer', label: 'Developer', tabs: [{ id: 'mcp', label: 'MCP handoff', icon: 'mcp' }, { id: 'jira', label: 'Jira board', icon: 'jira' }] },
  { id: 'new-role', label: 'New role', tabs: [{ id: 'x', label: 'Odd tab', icon: 'not-an-icon' }] },
]

const mount = (props: Partial<Parameters<typeof PersonaScreen>[0]> = {}) => render(<PersonaScreen personas={personas} onConfirm={() => undefined} still {...props} />)

describe('PersonaScreen', () => {
  it('lists every persona as a radio and waits for a pick', () => {
    mount()
    expect(screen.getAllByRole('radio')).toHaveLength(3)
    expect(screen.getByRole('radiogroup', { name: 'Who’s joining the flock?' })).toBeInTheDocument()
    expect(screen.getByText('Tap a bird to say hello')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
  })

  it('shows what a persona gets once its bird is picked', () => {
    mount()
    fireEvent.click(screen.getByRole('radio', { name: 'Developer' }))
    expect(screen.getByRole('radio', { name: 'Developer' })).toBeChecked()
    expect(screen.getByText('“Ship it. Then ship it again.”')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Developer tabs' }).querySelectorAll('li')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Continue as Developer' })).toBeEnabled()
  })

  it('still shows a persona that has no copy yet', () => {
    mount()
    fireEvent.click(screen.getByRole('radio', { name: 'New role' }))
    expect(screen.getByText('“Hello there!”')).toBeInTheDocument()
    expect(screen.getByText('Odd tab')).toBeInTheDocument()
  })

  it('moves focus with the arrow keys, wrapping at the ends, without picking', () => {
    mount()
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Design System' }), { key: 'ArrowLeft' })
    expect(screen.getByRole('radio', { name: 'New role' })).toHaveFocus()
    expect(screen.getByRole('radio', { name: 'New role' })).not.toBeChecked()
    fireEvent.keyDown(screen.getByRole('radio', { name: 'New role' }), { key: 'ArrowRight' })
    expect(screen.getByRole('radio', { name: 'Design System' })).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
  })

  it('shows the focus ring only once someone navigates by keyboard', () => {
    const { container } = mount()
    const root = container.querySelector('.bb-pick')!
    expect(screen.getByRole('radio', { name: 'Design System' })).toHaveFocus()
    expect(root).not.toHaveClass('uses-keyboard')
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Design System' }), { key: 'Enter', repeat: true })
    expect(root).not.toHaveClass('uses-keyboard')
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Design System' }), { key: 'ArrowRight' })
    expect(root).toHaveClass('uses-keyboard')
    fireEvent.pointerDown(root)
    expect(root).not.toHaveClass('uses-keyboard')
  })

  it('keeps one bird in the tab order', () => {
    mount()
    expect(screen.getAllByRole('radio').map((r) => r.getAttribute('tabindex'))).toEqual(['0', '-1', '-1'])
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Design System' }), { key: 'ArrowRight' })
    expect(screen.getAllByRole('radio').map((r) => r.getAttribute('tabindex'))).toEqual(['-1', '0', '-1'])
  })

  it('sends the other birds away once one is picked and moves focus to Continue', () => {
    mount()
    fireEvent.click(screen.getByRole('radio', { name: 'Developer' }))
    expect(screen.getByRole('radio', { name: 'Design System' })).toBeDisabled()
    expect(screen.getByRole('radio', { name: 'New role' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Continue as Developer' })).toHaveFocus()
  })

  it('brings the flock back with Change persona', () => {
    mount()
    expect(screen.queryByRole('button', { name: 'Change persona' })).toBeNull()
    fireEvent.click(screen.getByRole('radio', { name: 'Developer' }))
    fireEvent.click(screen.getByRole('button', { name: 'Change persona' }))
    expect(screen.getByRole('radio', { name: 'Design System' })).toBeEnabled()
    expect(screen.getByRole('radio', { name: 'Developer' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'Developer' })).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
    fireEvent.click(screen.getByRole('radio', { name: 'New role' }))
    expect(screen.getByRole('button', { name: 'Continue as New role' })).toBeEnabled()
  })

  it('plays the landing once, so a bird losing the selection does not drop from the top', () => {
    const { container } = render(<PersonaScreen personas={personas} onConfirm={() => undefined} />)
    const root = container.querySelector('.bb-pick')!
    expect(root).toHaveClass('has-intro')
    fireEvent.click(screen.getByRole('radio', { name: 'Developer' }))
    expect(root).not.toHaveClass('has-intro')
    fireEvent.click(screen.getByRole('button', { name: 'Change persona' }))
    expect(root).not.toHaveClass('has-intro')
    expect(root).toHaveClass('is-returning')
  })

  it('confirms the picked persona once', async () => {
    const onConfirm = vi.fn()
    mount({ onConfirm, initialId: 'developer' })
    fireEvent.click(screen.getByRole('button', { name: 'Continue as Developer' }))
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('developer'))
    expect(onConfirm).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Continue as Developer' })).toBeDisabled()
  })

  it('opens on the current persona with the others already gone', () => {
    const { container } = mount({ initialId: 'developer', intro: false })
    expect(container.querySelector('.bb-pick')).toHaveClass('is-instant')
    expect(screen.getByRole('radio', { name: 'Design System' })).toBeDisabled()
  })

  it('offers Back only when there is somewhere to go back to', () => {
    const onCancel = vi.fn()
    const { unmount } = mount()
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull()
    unmount()
    mount({ onCancel })
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('ignores an initial persona this brand does not have', () => {
    mount({ initialId: 'gone' })
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
  })
})
