import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { LinkButton } from './LinkButton'

describe('LinkButton', () => {
  it('renders a real button so it is keyboard reachable', () => {
    render(<LinkButton>Restore</LinkButton>)
    const btn = screen.getByRole('button', { name: 'Restore' })
    expect(btn.tagName).toBe('BUTTON')
    expect(btn).toHaveAttribute('type', 'button')
  })
  it('fires onClick', () => {
    const calls: string[] = []
    render(<LinkButton onClick={() => calls.push('hit')}>Select all</LinkButton>)
    screen.getByRole('button', { name: 'Select all' }).click()
    expect(calls).toEqual(['hit'])
  })
})
