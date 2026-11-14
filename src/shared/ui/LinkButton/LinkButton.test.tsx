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
  it('picks the glyph from the label when none is given', async () => {
    const { render, screen } = await import('@testing-library/preact')
    const { LinkButton } = await import('./LinkButton')
    render(<LinkButton>Delete</LinkButton>)
    expect(screen.getByRole('button', { name: 'Delete' }).querySelector('.bb-link-button__icon')).toHaveAttribute('data-icon', 'ui-general-trash')
  })
  it('draws no glyph for icon={null} or a back link', async () => {
    const { render, screen } = await import('@testing-library/preact')
    const { LinkButton } = await import('./LinkButton')
    render(<><LinkButton icon={null}>Delete</LinkButton><LinkButton>← Back to history</LinkButton></>)
    for (const name of ['Delete', '← Back to history']) {
      const link = screen.getByRole('button', { name })
      expect(link.querySelector('.bb-link-button__icon')).toBeNull()
      expect(link).not.toHaveAttribute('data-icon')
    }
  })
})
