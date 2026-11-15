import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { Footer } from './Footer'

describe('Footer', () => {
  it('shows the info button only when it has a handler, pressed while the intro is open', () => {
    const onHelp = vi.fn()
    const { rerender } = render(<Footer resizable={false} />)
    expect(screen.queryByRole('button', { name: 'Show tab intro' })).toBeNull()
    rerender(<Footer resizable={false} onHelp={onHelp} />)
    const help = screen.getByRole('button', { name: 'Show tab intro' })
    expect(help).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(help)
    expect(onHelp).toHaveBeenCalledTimes(1)
    rerender(<Footer resizable={false} onHelp={onHelp} helpActive />)
    expect(screen.getByRole('button', { name: 'Show tab intro' })).toHaveAttribute('aria-pressed', 'true')
  })
  it('renders a <footer> with the four default status pills and the meta line', () => {
    render(<Footer />)
    expect(screen.getByRole('contentinfo')).toHaveClass('bb-footer')
    expect(screen.getAllByRole('status').map((el) => el.textContent)).toEqual(['Git', 'UXAI', 'MCP', 'Dual File'])
    expect(screen.getByText('V2.11.0')).toBeInTheDocument()
  })
  it('hides pills through the Figma booleans and separates the rest with dividers', () => {
    const { container } = render(<Footer uxai={false} dualFile={false} />)
    expect(screen.getAllByRole('status').map((el) => el.textContent)).toEqual(['Git', 'MCP'])
    expect(container.querySelectorAll('.bb-footer__divider')).toHaveLength(1)
  })
  it('lets an explicit pill list replace the booleans', () => {
    render(<Footer git={false} pills={[{ label: 'Cloud', status: 'error' }]} />)
    const pill = screen.getByRole('status')
    expect(pill).toHaveTextContent('Cloud')
    expect(pill.dataset.status).toBe('error')
  })
  it('hides the size steps, minimize and grip when the panel cannot be resized', () => {
    const { container } = render(<Footer resizable={false} onMinimize={() => undefined} />)
    expect(container.querySelector('.bb-footer__controls')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Minimize' })).toBeNull()
  })

  it('forwards size changes and the minimize click', () => {
    const onSizeChange = vi.fn()
    const onMinimize = vi.fn()
    render(<Footer size="S" onSizeChange={onSizeChange} onMinimize={onMinimize} />)
    fireEvent.click(screen.getByRole('radio', { name: 'L' }))
    expect(onSizeChange).toHaveBeenCalledWith('L')
    const minimize = screen.getByRole('button', { name: 'Minimize' })
    expect(minimize.querySelector('[data-icon="ui-sidebar-minimize-corners"]')).not.toBeNull()
    fireEvent.click(minimize)
    expect(onMinimize).toHaveBeenCalledTimes(1)
  })

  it('shows a live status for a default pill, with its detail on hover', () => {
    render(<Footer statuses={{ dualFile: { label: 'Dual File · 1 of 2 files', status: 'issue', title: 'File 2: not found' } }} />)
    const pill = screen.getAllByRole('status')[3]!
    expect(pill).toHaveTextContent('Dual File · 1 of 2 files')
    expect(pill).toHaveAttribute('data-status', 'issue')
    expect(pill).toHaveAttribute('title', 'File 2: not found')
  })
})
