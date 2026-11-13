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

describe('LinkButton icon', () => {
  it('draws a trailing glyph that stays out of the accessible name', async () => {
    const { render, screen } = await import('@testing-library/preact')
    const { EXTERNAL_LINK_ICON, LinkButton } = await import('./LinkButton')
    render(<LinkButton icon={EXTERNAL_LINK_ICON}>Open in Jira</LinkButton>)
    const link = screen.getByRole('button', { name: 'Open in Jira' })
    expect(link.querySelector('.bb-link-button__icon')).toHaveAttribute('data-icon', EXTERNAL_LINK_ICON)
    expect(link).toHaveAttribute('data-icon')
  })
})
