import { describe, it, expect } from 'vitest'
import { createdLabel, documentId, logoSvg, normalizeHex, readDocTheme } from '../ui/docTheme'

describe('normalizeHex', () => {
  it('accepts the forms CSS gives back and rejects the rest', () => {
    expect(normalizeHex('#FFF')).toBe('#ffffff')
    expect(normalizeHex(' #0B57D0 ')).toBe('#0b57d0')
    expect(normalizeHex('#0b57d0cc')).toBe('#0b57d0')
    expect(normalizeHex('rgb(11, 87, 208)')).toBe('#0b57d0')
    expect(normalizeHex('var(--x)')).toBeNull()
    expect(normalizeHex('')).toBeNull()
  })
})

describe('readDocTheme', () => {
  it('reads the report tokens and the brand banner from CSS, falling back to the Figma values', () => {
    const root = document.createElement('div')
    root.style.setProperty('--bb-banner-bg', '#1a51a4')
    root.dataset.brand = 'gap'
    document.body.appendChild(root)
    const theme = readDocTheme(root)
    expect(theme.banner.bg).toBe('#1a51a4')
    expect(theme.page).toBe('#ffffff')
    expect(theme.severity.critical).toEqual({ fg: '#7d2420', bg: '#ffd6ce' })
    expect(theme.logoSvg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="/)
    root.remove()
  })
})

describe('logoSvg', () => {
  it('is empty for an unknown brand', () => {
    expect(logoSvg(undefined)).toBe('')
    expect(logoSvg('nope')).toBe('')
  })
})

describe('documentId and createdLabel', () => {
  const at = new Date(2026, 10, 10, 14, 32)
  it('are sortable and human', () => {
    expect(documentId('R', at)).toBe('A11Y-R-20261110-1432')
    expect(createdLabel(at)).toBe('10 Nov 2026, 14:32')
  })
})

describe('docTheme fallback colours', () => {
  it('match the generated a11y/report/* tokens in every brand, so a Figma change cannot leave them behind', async () => {
    const { readFileSync, readdirSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const { FALLBACK } = await import('../ui/docTheme')
    const dir = resolve(import.meta.dirname, '../../../shared/brand/generated')
    const brands = readdirSync(dir).filter((f) => /^brand\..+\.css$/.test(f))
    expect(brands.length).toBeGreaterThan(0)
    const reportTokens = Object.entries(FALLBACK).filter(([name]) => name.startsWith('a11y-report-'))
    expect(reportTokens.length).toBeGreaterThan(0)
    for (const file of brands) {
      const css = readFileSync(resolve(dir, file), 'utf8')
      for (const [name, hex] of reportTokens) {
        const value = new RegExp(`--bb-${name}:\\s*([^;]+);`).exec(css)?.[1]
        expect(`${file} ${name} ${normalizeHex(value ?? '')}`).toBe(`${file} ${name} ${hex}`)
      }
    }
  })
})
