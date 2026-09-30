import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { SettingsScreen } from './SettingsScreen'

const noop = () => Promise.resolve()

describe('SettingsScreen', () => {
  it('renders the session summary as the composed Toggle with its switch hidden (Figma Toggle=false)', () => {
    const { container } = render(<SettingsScreen session={{ brandId: 'ikea', since: '2026-09-22T09:00:00Z' }} brand={null} onLogout={noop} onReset={noop} />)
    const row = container.querySelector('.bb-settings .bb-toggle')
    expect(row).not.toBeNull()
    expect(row?.querySelector('.bb-toggle__title')?.textContent).toBe('Signed in as Ikea')
    expect(row?.querySelector('.bb-toggle__description')?.textContent).toMatch(/You stay signed in until you log off/)
    expect(screen.queryByRole('switch')).toBeNull()
  })
})
