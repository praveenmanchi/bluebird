import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { Notice } from './Notice'

describe('Notice', () => {
  it('renders the Figma Info copy with the lock glyph', () => {
    const { container } = render(<Notice />)
    expect(screen.getByText('Private plugin · HCLTech only')).toBeInTheDocument()
    expect(container.querySelector('[data-icon="access"]')).not.toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })
  it('announces the Error tone', () => {
    render(<Notice tone="error" title="Couldn’t sign in">Try again.</Notice>)
    expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t sign in')
    expect(screen.getByRole('alert').querySelector('[data-icon="status-error"]')).not.toBeNull()
  })
  it('drops the icon when bare', () => {
    const { container } = render(<Notice bare />)
    expect(container.querySelector('.bb-icon')).toBeNull()
    expect(container.querySelector('.bb-notice')?.hasAttribute('data-bare')).toBe(true)
  })
})
