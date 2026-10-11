import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { ReleaseRow } from './ReleaseRow'

const root = (c: Element) => c.querySelector<HTMLElement>('.bb-release-row')!
const badge = (c: Element) => c.querySelector<HTMLElement>('.bb-meta-badge')!

describe('ReleaseRow', () => {
  it('defaults to Status=Live with the Figma copy', () => {
    const { container } = render(<ReleaseRow />)
    expect(root(container).getAttribute('data-status')).toBe('live')
    expect(screen.getByText('v2.5.0')).toBeInTheDocument()
    expect(screen.getByText('Date picker, darker primary button')).toBeInTheDocument()
    expect(screen.getByText('Praveen · 9 Oct · 12 changes')).toBeInTheDocument()
    expect(badge(container).getAttribute('data-tone')).toBe('success')
    expect(screen.getByText('Live')).toBeInTheDocument()
    expect(root(container).getAttribute('aria-busy')).toBeNull()
  })
  it('shows an accent Building badge and aria-busy', () => {
    const { container } = render(<ReleaseRow status="building" />)
    expect(badge(container).getAttribute('data-tone')).toBe('accent')
    expect(screen.getByText('Building')).toBeInTheDocument()
    expect(root(container).getAttribute('aria-busy')).toBe('true')
  })
  it('shows a danger Failed badge', () => {
    const { container } = render(<ReleaseRow status="failed" />)
    expect(badge(container).getAttribute('data-tone')).toBe('danger')
    expect(screen.getByText('Failed')).toBeInTheDocument()
  })
  it('renders custom version, summary and meta', () => {
    render(<ReleaseRow version="v3.0.0" summary="Major" meta="Today" />)
    expect(screen.getByText('v3.0.0')).toBeInTheDocument()
    expect(screen.getByText('Major')).toBeInTheDocument()
    expect(screen.getByText('Today')).toBeInTheDocument()
  })
})
