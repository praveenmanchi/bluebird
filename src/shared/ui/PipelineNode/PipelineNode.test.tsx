import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { PipelineNode } from './PipelineNode'

const root = (c: Element) => c.querySelector<HTMLElement>('.bb-pipeline-node')!
const glyphs = (c: Element) => [...c.querySelectorAll('[data-icon]')].map((n) => n.getAttribute('data-icon'))

describe('PipelineNode', () => {
  it('defaults to Status=Done with the Figma copy and the layers icon', () => {
    const { container } = render(<PipelineNode />)
    expect(root(container).getAttribute('data-status')).toBe('done')
    expect(glyphs(container)).toEqual(['layers', 'status-good'])
    expect(screen.getByRole('img', { name: 'Done' })).toBeInTheDocument()
    expect(screen.getByText('Figma file')).toBeInTheDocument()
    expect(screen.getByText('Bridge DS · v14')).toBeInTheDocument()
    expect(root(container).getAttribute('aria-busy')).toBeNull()
  })
  it('shows an accent spinner and aria-busy while Running', () => {
    const { container } = render(<PipelineNode status="running" />)
    expect(root(container).getAttribute('aria-busy')).toBe('true')
    expect(container.querySelector('.bb-spinner')?.getAttribute('data-tone')).toBe('accent')
    expect(screen.getByRole('img', { name: 'Running' })).toBeInTheDocument()
    expect(glyphs(container)).toEqual(['layers'])
  })
  it('swaps in the error glyph for Error', () => {
    const { container } = render(<PipelineNode status="error" />)
    expect(glyphs(container)).toEqual(['layers', 'status-error'])
    expect(screen.getByRole('img', { name: 'Error' })).toBeInTheDocument()
  })
  it('draws no glyph for Idle but keeps the status as text', () => {
    const { container } = render(<PipelineNode status="idle" />)
    expect(glyphs(container)).toEqual(['layers'])
    expect(container.querySelector('.bb-spinner')).toBeNull()
    expect(screen.getByText('Idle')).toBeInTheDocument()
  })
  it('renders custom copy, a swapped icon and a brands logo', () => {
    const { container, rerender } = render(<PipelineNode name="Docs site" meta="ds.bridge.design" icon="url" />)
    expect(screen.getByText('Docs site')).toBeInTheDocument()
    expect(screen.getByText('ds.bridge.design')).toBeInTheDocument()
    expect(glyphs(container)[0]).toBe('url')
    rerender(<PipelineNode logo="github" />)
    expect(container.querySelector('.bb-pipeline-node__icon')?.getAttribute('data-logo')).toBe('github')
    expect(glyphs(container)).toEqual(['status-good'])
  })
})
