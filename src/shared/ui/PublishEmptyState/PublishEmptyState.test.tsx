import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { PublishEmptyState, type PublishEmptyStateKind } from './PublishEmptyState'

const glyph = (c: Element) => c.querySelector('[data-icon]')?.getAttribute('data-icon')
const variants = (c: Element) => [...c.querySelectorAll('button')].map((b) => [b.textContent, b.getAttribute('data-variant')])

describe('PublishEmptyState', () => {
  it('defaults to State=No changes with the Figma copy and a secondary View live site button', () => {
    const { container } = render(<PublishEmptyState />)
    expect(container.querySelector('.bb-publish-empty-state')?.getAttribute('data-state')).toBe('no-changes')
    expect(glyph(container)).toBe('status-good')
    expect(screen.getByRole('heading', { name: 'Everything is published' })).toBeInTheDocument()
    expect(screen.getByText('No variable or component changes since v2.5.0. Edits made in this file show up here automatically.')).toBeInTheDocument()
    expect(variants(container)).toEqual([['View live site', 'secondary']])
    expect(screen.getByRole('button').getAttribute('data-width')).toBe('fixed')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it.each<[PublishEmptyStateKind, string, string, [string, string][]]>([
    ['not-connected', 'git-merg', 'Connect a repository', [['Connect GitHub', 'primary']]],
    ['failed', 'status-error', 'Site build failed', [['View log', 'secondary'], ['Retry build', 'primary']]],
    ['first-release', 'change-log', 'Ready for your first release', [['Start review', 'primary']]],
    ['empty-file', 'layers', 'Nothing to publish yet', [['How publishing works', 'secondary']]],
    ['ready-to-extract', 'extract', 'Extract changes from this file', [['Run extract', 'primary']]],
  ])('maps State=%s to its glyph, title and buttons', (state, icon, title, buttons) => {
    const { container } = render(<PublishEmptyState state={state} />)
    expect(glyph(container)).toBe(icon)
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    expect(variants(container)).toEqual(buttons)
  })

  it('sizes Tab Icons glyphs at lg and announces Failed as an alert', () => {
    const { container, rerender } = render(<PublishEmptyState state="empty-file" />)
    expect(container.querySelector('[data-icon]')?.getAttribute('data-size')).toBe('lg')
    rerender(<PublishEmptyState state="failed" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Site build failed')
    expect(screen.getByText('GitHub Actions run #482 failed at "Build docs". Nothing was deployed; v2.4.0 is still live.')).toBeInTheDocument()
  })

  it('wires custom actions and copy overrides', () => {
    const retry = vi.fn()
    const log = vi.fn()
    render(
      <PublishEmptyState
        state="failed"
        title="Deploy failed"
        body="Try again in a minute."
        actions={[{ label: 'Open log', variant: 'secondary', onClick: log }, { label: 'Retry', onClick: retry }, { label: 'Skip', disabled: true }]}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Deploy failed' })).toBeInTheDocument()
    expect(screen.getByText('Try again in a minute.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open log' }))
    expect(retry).toHaveBeenCalledTimes(1)
    expect(log).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Retry' }).getAttribute('data-variant')).toBe('primary')
    expect(screen.getByRole('button', { name: 'Skip' })).toBeDisabled()
  })
  it('swaps the glyph for a Tab Icons override', () => {
    const { container } = render(<PublishEmptyState state="failed" icon="mcp" />)
    expect(container.querySelector('.bb-publish-empty-state__icon-box')?.getAttribute('data-kind')).toBe('tab')
    expect(container.querySelector('[data-icon]')?.getAttribute('data-icon')).toBe('mcp')
  })
})
