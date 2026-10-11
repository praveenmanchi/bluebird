import { describe, it, expect, afterEach } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { Banner } from './Banner'
import { brandStatus, connection } from './state'

afterEach(() => { brandStatus.value = null; connection.value = 'connected' })

describe('shell Banner', () => {
  it('has no persona switch (it lives in Settings)', () => {
    brandStatus.value = { brandId: 'bridge', source: 'fallback', tokens: {}, note: 'Using generated tokens.' }
    render(<Banner />)
    expect(screen.queryByLabelText('Persona')).toBeNull()
  })

  it('hides the status bar once the brand comes from Figma and the bridge is connected', () => {
    brandStatus.value = { brandId: 'bridge', source: 'figma', tokens: {} }
    const { container } = render(<Banner />)
    expect(container.querySelector('.bb-app-subbar')).toBeNull()
  })

  it('shows the fallback note while tokens are generated, and the link state when disconnected', () => {
    brandStatus.value = { brandId: 'bridge', source: 'fallback', tokens: {}, note: 'Using generated tokens.' }
    const { container, rerender } = render(<Banner />)
    expect(container.querySelector('.bb-app-subbar')?.textContent).toBe('Using generated tokens.')
    brandStatus.value = { brandId: 'bridge', source: 'figma', tokens: {} }
    connection.value = 'disconnected'
    rerender(<Banner />)
    expect(container.querySelector('.bb-app-subbar')?.textContent).toBe('disconnected')
  })
})
