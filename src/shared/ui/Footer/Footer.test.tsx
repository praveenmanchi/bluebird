import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { Footer } from './Footer'

describe('Footer', () => {
  it('renders a <footer> with the four default status pills and the meta line', () => {
    render(<Footer />)
    expect(screen.getByRole('contentinfo')).toHaveClass('bb-footer')
    expect(screen.getAllByRole('status').map((el) => el.textContent)).toEqual(['Local', 'UX AI', 'MCP', 'Dual File'])
    expect(screen.getByText('V2.11.0')).toBeInTheDocument()
  })
  it('hides pills through the Figma booleans and separates the rest with dividers', () => {
    const { container } = render(<Footer uxai={false} dualFile={false} />)
    expect(screen.getAllByRole('status').map((el) => el.textContent)).toEqual(['Local', 'MCP'])
    expect(container.querySelectorAll('.bb-footer__divider')).toHaveLength(1)
  })
  it('lets an explicit pill list replace the booleans', () => {
    render(<Footer local={false} pills={[{ label: 'Cloud', status: 'error' }]} />)
    const pill = screen.getByRole('status')
    expect(pill).toHaveTextContent('Cloud')
    expect(pill.dataset.status).toBe('error')
  })
  it('forwards size changes and the expand click', () => {
    const onSizeChange = vi.fn()
    const onExpand = vi.fn()
    render(<Footer size="S" onSizeChange={onSizeChange} onExpand={onExpand} />)
    fireEvent.click(screen.getByRole('radio', { name: 'L' }))
    expect(onSizeChange).toHaveBeenCalledWith('L')
    fireEvent.click(screen.getByRole('button', { name: 'Expand' }))
    expect(onExpand).toHaveBeenCalledTimes(1)
  })
})
