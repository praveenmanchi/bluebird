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

  it('never shows brand-token notes: generated tokens are the brand, and Settings names the source', () => {
    for (const status of [
      { brandId: 'ikea', source: 'fallback' as const, tokens: {}, expected: true, note: 'Variable collection "Brand UI" not found in this file or its enabled libraries. Using fallback tokens.' },
      { brandId: 'ikea', source: 'fallback' as const, tokens: {}, note: 'Could not read the "Brand UI" library collection (offline). Using fallback tokens.' },
      { brandId: 'bridge', source: 'fallback' as const, tokens: {}, note: 'Mock mode: no Figma document. Using generated tokens from figma/tokens.json.' },
    ]) {
      brandStatus.value = status
      const { container, unmount } = render(<Banner />)
      expect(container.querySelector('.bb-app-subbar')).toBeNull()
      unmount()
    }
  })

  it('shows the link state while the live bridge is not connected', () => {
    brandStatus.value = { brandId: 'bridge', source: 'fallback', tokens: {}, note: 'Using generated tokens.' }
    connection.value = 'disconnected'
    const { container, rerender } = render(<Banner />)
    expect(container.querySelector('.bb-app-subbar')?.textContent).toBe('disconnected')
    connection.value = 'connecting'
    rerender(<Banner />)
    expect(container.querySelector('.bb-app-subbar')?.textContent).toBe('connecting…')
  })
})
