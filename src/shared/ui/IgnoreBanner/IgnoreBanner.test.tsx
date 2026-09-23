import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { IgnoreBanner } from './IgnoreBanner'

describe('IgnoreBanner', () => {
  it('is a note, and says so when no reason was recorded', () => {
    render(<IgnoreBanner />)
    expect(screen.getByRole('note')).toBeInTheDocument()
    expect(screen.getByText('Ignored without a reason')).toBeInTheDocument()
  })
  it('renders only the provenance fields it was given', () => {
    const { container } = render(<IgnoreBanner reason="Decorative" author="Praveen" />)
    expect(container.querySelectorAll('.bb-ignore-banner__meta-item')).toHaveLength(1)
    expect(screen.getByText('Praveen')).toBeInTheDocument()
  })
  it('fires onUndo', () => {
    const calls: string[] = []
    render(<IgnoreBanner reason="Decorative" onUndo={() => calls.push('undo')} />)
    screen.getByRole('button', { name: 'Restore' }).click()
    expect(calls).toEqual(['undo'])
  })
})
