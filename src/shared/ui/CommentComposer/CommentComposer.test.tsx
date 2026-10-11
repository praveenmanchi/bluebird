import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { CommentComposer } from './CommentComposer'

const field = () => screen.getByRole('textbox', { name: 'Comment' }) as HTMLTextAreaElement

describe('CommentComposer', () => {
  it('renders the Figma default: placeholder, avatar, attach icons, Cancel and Save', () => {
    const { container } = render(<CommentComposer />)
    expect(field().placeholder).toBe('Add a comment… type @ to mention a teammate')
    expect(screen.getByText('PM').closest('.bb-avatar')?.getAttribute('data-size')).toBe('md')
    expect(container.querySelector('[data-icon="url"]')).not.toBeNull()
    expect(container.querySelector('[data-icon="file"]')).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Cancel' }).getAttribute('data-variant')).toBe('secondary')
    expect(screen.getByRole('button', { name: 'Save' }).getAttribute('data-variant')).toBe('primary')
    expect(screen.getByRole('button', { name: 'Save' }).getAttribute('data-width')).toBe('fixed')
  })
  it('keeps its own draft and submits then clears it (uncontrolled)', () => {
    const onSubmit = vi.fn()
    render(<CommentComposer onSubmit={onSubmit} />)
    fireEvent.input(field(), { target: { value: 'Looks good' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).toHaveBeenCalledWith('Looks good')
    expect(field().value).toBe('')
  })
  it('ignores a blank draft and submits on Ctrl+Enter', () => {
    const onSubmit = vi.fn()
    render(<CommentComposer onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).not.toHaveBeenCalled()
    fireEvent.input(field(), { target: { value: 'Ship it' } })
    fireEvent.keyDown(field(), { key: 'Enter', ctrlKey: true })
    expect(onSubmit).toHaveBeenCalledWith('Ship it')
  })
  it('is controllable and reports keystrokes', () => {
    const onValueChange = vi.fn()
    render(<CommentComposer value="Fixed" onValueChange={onValueChange} />)
    expect(field().value).toBe('Fixed')
    fireEvent.input(field(), { target: { value: 'Fixed!' } })
    expect(onValueChange).toHaveBeenCalledWith('Fixed!')
  })
  it('wires Cancel and the attach icons', () => {
    const onCancel = vi.fn()
    const onAttachLink = vi.fn()
    const onAttachFile = vi.fn()
    render(<CommentComposer defaultValue="draft" onCancel={onCancel} onAttachLink={onAttachLink} onAttachFile={onAttachFile} />)
    fireEvent.click(screen.getByRole('button', { name: 'Attach link' }))
    fireEvent.click(screen.getByRole('button', { name: 'Attach file' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onAttachLink).toHaveBeenCalledTimes(1)
    expect(onAttachFile).toHaveBeenCalledTimes(1)
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(field().value).toBe('')
  })
})
