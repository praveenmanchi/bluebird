import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { Comment } from './Comment'

describe('Comment', () => {
  it('renders the Figma default author, time, body, avatar and actions', () => {
    render(<Comment />)
    expect(screen.getByRole('article')).toBeInTheDocument()
    expect(screen.getByText('Anika Kumar')).toBeInTheDocument()
    expect(screen.getByText('2 hours ago').tagName).toBe('TIME')
    expect(screen.getByText(/Dev handoff is blocked/)).toBeInTheDocument()
    expect(screen.getByText('AK').closest('.bb-avatar')?.getAttribute('data-size')).toBe('md')
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Reply', 'Edit', 'Delete'])
  })
  it('hides the actions when Show actions is off', () => {
    render(<Comment showActions={false} />)
    expect(screen.queryByRole('button')).toBeNull()
  })
  it('wires the Reply / Edit / Delete callbacks', () => {
    const onReply = vi.fn()
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    render(<Comment onReply={onReply} onEdit={onEdit} onDelete={onDelete} />)
    fireEvent.click(screen.getByRole('button', { name: 'Reply' }))
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onReply).toHaveBeenCalledTimes(1)
    expect(onEdit).toHaveBeenCalledTimes(1)
    expect(onDelete).toHaveBeenCalledTimes(1)
  })
})
