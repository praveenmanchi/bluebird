import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { ArtifactHeader } from './ArtifactHeader'

describe('ArtifactHeader', () => {
  it('renders the Figma defaults with the colors glyph', () => {
    const { container } = render(<ArtifactHeader />)
    expect(screen.getByText('surface/accent')).toBeInTheDocument()
    expect(screen.getByText('Colour variable · Brand UI · used in 38 layers')).toBeInTheDocument()
    expect(container.querySelector('[data-icon]')?.getAttribute('data-icon')).toBe('colors')
  })
  it('renders the open action as a real Link Button and fires onOpen', () => {
    const calls: string[] = []
    const { container } = render(<ArtifactHeader onOpen={() => calls.push('open')} />)
    const open = screen.getByRole('button', { name: 'Open in Figma ↗' })
    expect(container.querySelector('.bb-link-button')).toBe(open)
    open.click()
    expect(calls).toEqual(['open'])
  })
  it('swaps the icon and the action label like the Figma instance overrides', () => {
    const { container } = render(<ArtifactHeader icon="component" title="Button" actionLabel="Go to component ↗" />)
    expect(container.querySelector('[data-icon]')?.getAttribute('data-icon')).toBe('component')
    expect(screen.getByRole('button', { name: 'Go to component ↗' })).toBeInTheDocument()
  })
})
