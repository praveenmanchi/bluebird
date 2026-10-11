import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { PublishStep } from './PublishStep'

const root = (c: Element) => c.querySelector<HTMLElement>('.bb-publish-step')!
const glyph = (c: Element) => c.querySelector('[data-icon]')?.getAttribute('data-icon')

describe('PublishStep', () => {
  it('defaults to Status=Done with the Figma copy', () => {
    const { container } = render(<PublishStep />)
    expect(root(container).getAttribute('data-status')).toBe('done')
    expect(glyph(container)).toBe('status-good')
    expect(screen.getByRole('img', { name: 'Done' })).toBeInTheDocument()
    expect(screen.getByText('Commit to repository')).toBeInTheDocument()
    expect(screen.getByText('praveenmanchi/bridge-ds-site · main · 3f9c2e1')).toBeInTheDocument()
    expect(screen.getByText('12s')).toBeInTheDocument()
  })
  it('shows an accent spinner and aria-busy while Running', () => {
    const { container } = render(<PublishStep status="running" />)
    expect(root(container).getAttribute('aria-busy')).toBe('true')
    expect(container.querySelector('.bb-spinner')?.getAttribute('data-tone')).toBe('accent')
    expect(screen.getByRole('img', { name: 'Running' })).toBeInTheDocument()
    expect(glyph(container)).toBeUndefined()
  })
  it('draws the queued ring with an accessible name', () => {
    const { container } = render(<PublishStep status="queued" />)
    expect(container.querySelector('.bb-publish-step__ring')).not.toBeNull()
    expect(screen.getByRole('img', { name: 'Queued' })).toBeInTheDocument()
    expect(root(container).getAttribute('aria-busy')).toBeNull()
  })
  it('swaps in the error glyph for Failed', () => {
    const { container } = render(<PublishStep status="failed" />)
    expect(root(container).getAttribute('data-status')).toBe('failed')
    expect(glyph(container)).toBe('status-error')
    expect(screen.getByRole('img', { name: 'Failed' })).toBeInTheDocument()
  })
  it('renders custom title, detail and time', () => {
    render(<PublishStep title="Deploy" detail="ds.bridge.design" time="4s" />)
    expect(screen.getByText('Deploy')).toBeInTheDocument()
    expect(screen.getByText('ds.bridge.design')).toBeInTheDocument()
    expect(screen.getByText('4s')).toBeInTheDocument()
  })
})
