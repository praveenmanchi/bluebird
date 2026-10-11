import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { ChangelogNote } from './ChangelogNote'

const root = (c: Element) => c.querySelector<HTMLElement>('.bb-changelog-note')!
const NOTE = 'Primary button background darkened from #0C8CE9 to #0560A3 so white labels pass AA (4.9:1).'

describe('ChangelogNote', () => {
  it('defaults to State=Auto with the Figma copy, a Modified badge and the Edit link', () => {
    const { container } = render(<ChangelogNote />)
    expect(root(container).getAttribute('data-state')).toBe('auto')
    expect(screen.getByText('button/bg/primary')).toBeInTheDocument()
    expect(screen.getByText(NOTE)).toBeInTheDocument()
    expect(screen.getByText('Drafted from the diff · edit to add context')).toBeInTheDocument()
    expect(screen.getByText('Modified').closest('.bb-meta-badge')?.getAttribute('data-tone')).toBe('accent')
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('draws State=Edited with its Source line and the Done link', () => {
    const { container } = render(<ChangelogNote state="edited" />)
    expect(root(container).getAttribute('data-state')).toBe('edited')
    expect(screen.getByText('Edited by you · shows on the site changelog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument()
  })

  it.each([
    ['added', 'Added', 'success'],
    ['modified', 'Modified', 'accent'],
    ['removed', 'Removed', 'danger'],
    ['deprecated', 'Deprecated', 'warning'],
  ] as const)('maps change=%s to the %s badge', (change, label, tone) => {
    render(<ChangelogNote change={change} />)
    expect(screen.getByText(label).closest('.bb-meta-badge')?.getAttribute('data-tone')).toBe(tone)
  })

  it('edits the note in a labelled TextArea and reports input', () => {
    const onNoteInput = vi.fn()
    const { container } = render(<ChangelogNote title="color/accent" note="Old" editing onNoteInput={onNoteInput} />)
    expect(root(container).hasAttribute('data-editing')).toBe(true)
    const field = screen.getByRole('textbox', { name: 'Changelog note for color/accent' })
    expect(field).toHaveValue('Old')
    expect(screen.queryByText('Old', { selector: 'p' })).toBeNull()
    fireEvent.input(field, { target: { value: 'New context' } })
    expect(onNoteInput).toHaveBeenCalledWith('New context')
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument()
  })

  it('fires onAction from Edit and from Done', () => {
    const onAction = vi.fn()
    const { rerender } = render(<ChangelogNote onAction={onAction} />)
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    rerender(<ChangelogNote onAction={onAction} editing />)
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(onAction).toHaveBeenCalledTimes(2)
  })

  it('accepts source and action label overrides', () => {
    render(<ChangelogNote source="From PR #12" actionLabel="Revise" />)
    expect(screen.getByText('From PR #12')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Revise' })).toBeInTheDocument()
  })
})
