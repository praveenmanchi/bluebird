import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { ThemeChip, THEME_CHIP_THEMES, type ThemeChipTheme } from './ThemeChip'

describe('ThemeChip', () => {
  it('renders the EN label and the matching theme glyph for every Figma variant', () => {
    for (const theme of Object.keys(THEME_CHIP_THEMES) as ThemeChipTheme[]) {
      const { container, unmount } = render(<ThemeChip theme={theme} />)
      expect(screen.getByText(THEME_CHIP_THEMES[theme].label)).toBeInTheDocument()
      expect(container.querySelector(`.bb-icon[data-icon="${THEME_CHIP_THEMES[theme].icon}"]`)).not.toBeNull()
      unmount()
    }
  })
  it('exposes the variant through data-theme', () => {
    const { container } = render(<ThemeChip theme="whole-site" />)
    expect(container.querySelector('.bb-theme-chip')?.getAttribute('data-theme')).toBe('whole-site')
  })
  it('lets a translated label override the EN string', () => {
    render(<ThemeChip theme="zoom" label="Zoom et lisibilité" />)
    expect(screen.getByText('Zoom et lisibilité')).toBeInTheDocument()
    expect(screen.queryByText('Zoom and Legibility')).toBeNull()
  })
})
