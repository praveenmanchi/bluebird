import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { TypeArtifact } from './TypeArtifact'

describe('TypeArtifact', () => {
  it('renders the Figma default: header with the text glyph and four specimens', () => {
    const { container } = render(<TypeArtifact />)
    expect(container.querySelector('article.bb-type-artifact')).toBeInTheDocument()
    expect(screen.getByText('Type scale · Noto Sans')).toBeInTheDocument()
    expect(container.querySelector('.bb-artifact-header [data-icon]')?.getAttribute('data-icon')).toBe('text')
    const levels = [...container.querySelectorAll('.bb-type-specimen')].map((n) => n.getAttribute('data-level'))
    expect(levels).toEqual(['title', 'label', 'body', 'caption'])
  })
  it('renders custom levels with their samples', () => {
    const { container } = render(<TypeArtifact levels={[{ level: 'body', sample: 'Hello', spec: 'body spec' }]} />)
    expect(container.querySelectorAll('.bb-type-specimen')).toHaveLength(1)
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByText('body spec')).toBeInTheDocument()
  })
  it('fires onOpen from the header link', () => {
    const calls: string[] = []
    render(<TypeArtifact onOpen={() => calls.push('open')} />)
    screen.getByRole('button', { name: 'Open in Figma ↗' }).click()
    expect(calls).toEqual(['open'])
  })
})
