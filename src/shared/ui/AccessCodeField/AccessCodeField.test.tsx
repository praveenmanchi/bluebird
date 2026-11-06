import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { AccessCodeField } from './AccessCodeField'

describe('AccessCodeField', () => {
  it('labels a masked input and describes it with the default helper', () => {
    render(<AccessCodeField />)
    const input = screen.getByLabelText('Access code') as HTMLInputElement
    expect(input.type).toBe('password')
    expect(input.placeholder).toBe('Enter your access code')
    expect(input).toHaveAccessibleDescription('Codes look like TEAM-2026 and aren’t case-sensitive.')
  })
  it('reports typing', () => {
    const onValueChange = vi.fn()
    render(<AccessCodeField onValueChange={onValueChange} />)
    fireEvent.input(screen.getByLabelText('Access code'), { target: { value: 'IKEA-2026' } })
    expect(onValueChange).toHaveBeenCalledWith('IKEA-2026')
  })
  it('reveals and re-masks the code', () => {
    render(<AccessCodeField value="IKEA-2026" />)
    const input = screen.getByLabelText('Access code') as HTMLInputElement
    fireEvent.click(screen.getByRole('button', { name: 'Show access code' }))
    expect(input.type).toBe('text')
    expect(screen.getByRole('button', { name: 'Hide access code' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Hide access code' }))
    expect(input.type).toBe('password')
  })
  it('marks an error with the status glyph and the given helper', () => {
    const { container } = render(<AccessCodeField status="error" helperText="That access code is not recognised." />)
    expect(screen.getByLabelText('Access code')).toHaveAttribute('aria-invalid', 'true')
    expect(container.querySelector('[data-icon="status-error"]')).not.toBeNull()
    expect(screen.getByText('That access code is not recognised.')).toBeInTheDocument()
  })
  it('shows the success glyph and copy', () => {
    const { container } = render(<AccessCodeField status="success" />)
    expect(container.querySelector('[data-icon="status-good"]')).not.toBeNull()
    expect(screen.getByText('Code accepted. Opening Design Studio…')).toBeInTheDocument()
  })
  it('locks the input and the eye while checking', () => {
    render(<AccessCodeField disabled />)
    expect(screen.getByLabelText('Access code')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Show access code' })).toBeDisabled()
    expect(screen.getByText('Checking your code…')).toBeInTheDocument()
  })
  it('hides the helper on request', () => {
    render(<AccessCodeField showHelper={false} />)
    expect(screen.queryByText(/Codes look like/)).toBeNull()
  })
})
