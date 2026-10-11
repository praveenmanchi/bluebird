import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { ComponentArtifact } from './ComponentArtifact'

describe('ComponentArtifact', () => {
  it('renders the Figma default preview with the shared Button', () => {
    render(<ComponentArtifact />)
    const buttons = screen.getAllByRole('button', { name: 'Button' })
    expect(buttons.map((b) => b.getAttribute('data-variant'))).toEqual(['primary', 'secondary', 'primary'])
    expect(buttons.map((b) => (b as HTMLButtonElement).disabled)).toEqual([false, false, true])
    expect(buttons.every((b) => b.getAttribute('data-width') === 'fixed')).toBe(true)
    expect(buttons[0]!.querySelector('[data-icon="variables"]')).toBeInTheDocument()
  })
  it('renders the header with the component glyph and the overridden link label', () => {
    const { container } = render(<ComponentArtifact />)
    expect(container.querySelector('.bb-artifact-header [data-icon]')?.getAttribute('data-icon')).toBe('component')
    expect(screen.getByRole('button', { name: 'Go to component ↗' })).toBeInTheDocument()
  })
  it('lists properties as neutral Meta Badges and the code path as a Citation chip', () => {
    const { container } = render(<ComponentArtifact properties={['Tone', 'Label']} code="src/shared/ui/MetaBadge" />)
    const badges = [...container.querySelectorAll('.bb-meta-badge')]
    expect(badges.map((b) => b.textContent)).toEqual(['Tone', 'Label'])
    expect(badges.every((b) => b.getAttribute('data-tone') === 'neutral')).toBe(true)
    expect(container.querySelector('.bb-context-chip')?.getAttribute('data-type')).toBe('citation')
    expect(screen.getByText('src/shared/ui/MetaBadge')).toBeInTheDocument()
  })
  it('renders a custom preview in the slot and fires onOpen', () => {
    const calls: string[] = []
    render(<ComponentArtifact onOpen={() => calls.push('open')}><span>live render</span></ComponentArtifact>)
    expect(screen.getByText('live render')).toBeInTheDocument()
    expect(screen.queryAllByRole('button', { name: 'Button' })).toHaveLength(0)
    screen.getByRole('button', { name: 'Go to component ↗' }).click()
    expect(calls).toEqual(['open'])
  })
})
