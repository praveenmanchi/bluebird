import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { render } from '@testing-library/preact'
import type { ComponentChild } from 'preact'
import { BrandLogo } from './BrandLogo'

// Vitest blanks CSS imports (even ?raw), so the stylesheet is read from disk.
const css = readFileSync(fileURLToPath(import.meta.url).replace(/\.test\.tsx$/, '.css'), 'utf8')
const derived = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../brand/generated/derived.css'), 'utf8')

/** jsdom cascades stylesheet rules but neither inherits custom properties nor substitutes var(): do both. */
function display(el: Element): string {
  const value = getComputedStyle(el).display
  const ref = /^var\((--[\w-]+),\s*([\w-]+)\)$/.exec(value)
  if (!ref) return value
  for (let node: Element | null = el; node; node = node.parentElement) {
    const own = getComputedStyle(node).getPropertyValue(ref[1]!).trim()
    if (own) return own
  }
  return ref[2]!
}

function withStyles<T>(ui: ComponentChild, read: (container: Element) => T): T {
  const style = document.head.appendChild(document.createElement('style'))
  style.textContent = css
  try {
    return read(render(ui).container)
  } finally {
    style.remove()
  }
}

function shownLogos(ui: ComponentChild): (string | null)[] {
  return withStyles(ui, (container) => [...container.querySelectorAll('svg[data-logo]')].filter((n) => display(n) !== 'none').map((n) => n.getAttribute('data-logo')))
}

const BRANDS = ['bridge', 'ikea', 'richemont', 'disney', 'fiskars', 'akzonobel', 'adecco', 'gap'] as const

describe('BrandLogo', () => {
  it('renders every brand logo so [data-brand] can reveal the active one', () => {
    const { container } = render(<BrandLogo />)
    const logos = [...container.querySelectorAll('svg[data-logo]')].map((n) => n.getAttribute('data-logo'))
    expect(logos).toEqual(['bridge', 'ikea', 'richemont', 'disney', 'fiskars', 'akzonobel', 'adecco', 'gap'])
    expect(container.querySelector('[data-forced]')).toBeNull()
  })
  it('renders a single forced logo when brand is given', () => {
    const { container } = render(<BrandLogo brand="ikea" title="IKEA" />)
    const svgs = container.querySelectorAll('svg')
    expect(svgs).toHaveLength(1)
    expect(svgs[0]!.getAttribute('data-logo')).toBe('ikea')
    expect(svgs[0]!.hasAttribute('data-forced')).toBe(true)
    expect(svgs[0]!.getAttribute('role')).toBe('img')
    expect(svgs[0]!.innerHTML).toContain('<title>IKEA</title>')
  })
  it('renders the ikea export at its padded viewBox (107x35 around the 106.281 frame)', () => {
    const { container } = render(<BrandLogo brand="ikea" />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('viewBox')).toBe('0 0 107 35')
    expect([svg.getAttribute('width'), svg.getAttribute('height')]).toEqual(['107', '35'])
    // The frame fill: Figma's SVG export pads the 106.281 frame to whole pixels.
    expect(svg.querySelector('rect')?.getAttribute('width')).toBe('106.281')
  })
  it('sizes the ikea box from the 106.3x35 oval its Figma frame hugs, not the wordmark', () => {
    const size = withStyles(<BrandLogo brand="ikea" />, (container) => {
      const style = getComputedStyle(container.querySelector('svg')!)
      return [style.width, style.height]
    })
    expect(size).toEqual(['var(--bb-derived-brand-logo-vector-1-brand-ikea-width)', 'var(--bb-derived-brand-logo-vector-1-brand-ikea-height)'])
    // Both ikea vectors are named "Vector": `vector--1` is the oval only while it stays the first of them.
    expect(derived).toContain('--bb-derived-brand-logo-vector-1-brand-ikea-width: 106.3px;')
    expect(derived).toContain('--bb-derived-brand-logo-vector-1-brand-ikea-height: 35px;')
  })
  it('renders the current fiskars export, whose box fills the 140x30 frame instead of letterboxing', () => {
    const { container } = render(<BrandLogo brand="fiskars" />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('viewBox')).toBe('0 0 141 30')
    // The 140.4x29.6 box starts at the origin; the orange wordmark replaced the white one on 2026-09-23.
    expect(svg.querySelector('path')?.getAttribute('d')).toMatch(/^M0 0H140\.4/)
    expect(svg.innerHTML).toContain('fill="#DE8A2E"')
  })
  it('reveals the logo of the nearest [data-brand], so a nested brand scope shows only its own', () => {
    expect(shownLogos(<div data-brand="ikea"><BrandLogo /></div>)).toEqual(['ikea'])
    expect(shownLogos(<div data-brand="bridge"><div data-brand="ikea"><BrandLogo /></div></div>)).toEqual(['ikea'])
    expect(shownLogos(<div data-brand="bridge"><BrandLogo logo="hcltech" /></div>)).toEqual(['hcltech'])
  })
  it.each(BRANDS)('reveals only the %s logo inside its own scope, nested or not', (brand) => {
    const outer = brand === 'bridge' ? 'ikea' : 'bridge'
    expect(shownLogos(<div data-brand={brand}><BrandLogo /></div>)).toEqual([brand])
    expect(shownLogos(<div data-brand={outer}><div data-brand={brand}><BrandLogo /></div></div>)).toEqual([brand])
  })
})
