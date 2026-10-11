import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { VersionOption } from './VersionOption'

const root = (c: Element) => c.querySelector<HTMLElement>('.bb-version-option')!

describe('VersionOption', () => {
  it('defaults to Bump=Patch, Selected=No with the Figma copy and no badge', () => {
    const { container } = render(<VersionOption />)
    const radio = screen.getByRole('radio', { name: 'Patch v2.5.0' })
    expect(radio).not.toBeChecked()
    expect(radio.getAttribute('value')).toBe('patch')
    expect(radio).toHaveAccessibleDescription('New tokens or components')
    expect(root(container).getAttribute('data-bump')).toBe('patch')
    expect(root(container).hasAttribute('data-selected')).toBe(false)
    expect(screen.queryByText('Suggested')).toBeNull()
  })

  it.each([
    ['minor', 'Minor'],
    ['major', 'Major'],
  ] as const)('renders Bump=%s with its title', (bump, title) => {
    const { container } = render(<VersionOption bump={bump} version="v3.0.0" />)
    expect(screen.getByText(title)).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: `${title} v3.0.0` })).toBeInTheDocument()
    expect(root(container).getAttribute('data-bump')).toBe(bump)
  })

  it('marks Selected=Yes on the radio and the card', () => {
    const { container } = render(<VersionOption bump="minor" selected />)
    expect(screen.getByRole('radio')).toBeChecked()
    expect(root(container).hasAttribute('data-selected')).toBe(true)
  })

  it('shows the Suggested Meta Badge and adds it to the description', () => {
    const { container } = render(<VersionOption suggested hint="Recommended for this diff" />)
    const badge = screen.getByText('Suggested').closest('.bb-meta-badge')
    expect(badge?.getAttribute('data-tone')).toBe('accent')
    expect(screen.getByRole('radio')).toHaveAccessibleDescription('Suggested Recommended for this diff')
    expect(container.querySelectorAll('.bb-meta-badge')).toHaveLength(1)
  })

  it('fires onSelect when the card is clicked, and honours disabled', () => {
    const onSelect = vi.fn()
    const { rerender } = render(<VersionOption onSelect={onSelect} />)
    fireEvent.click(screen.getByText('v2.5.0'))
    expect(onSelect).toHaveBeenCalledTimes(1)
    rerender(<VersionOption onSelect={onSelect} disabled />)
    expect(screen.getByRole('radio')).toBeDisabled()
  })

  it('groups options by name so a radiogroup works', () => {
    render(
      <div role="radiogroup" aria-label="Version bump">
        <VersionOption name="bump" bump="patch" />
        <VersionOption name="bump" bump="minor" selected />
      </div>,
    )
    const radios = screen.getAllByRole('radio')
    expect(radios.map((r) => r.getAttribute('name'))).toEqual(['bump', 'bump'])
    expect(radios[1]).toBeChecked()
  })
})
