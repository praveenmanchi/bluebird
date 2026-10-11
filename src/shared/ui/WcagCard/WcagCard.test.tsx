import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { WcagCard } from './WcagCard'

describe('WcagCard', () => {
  it('renders the criterion code, title and description in an <article>', () => {
    render(<WcagCard code="1.4.3" title="Contrast (Minimum)" description="Body text needs 4.5:1." />)
    expect(screen.getByRole('article')).toHaveClass('bb-wcag-card')
    expect(screen.getByText('1.4.3')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Contrast (Minimum)' })).toBeInTheDocument()
    expect(screen.getByText('Body text needs 4.5:1.')).toBeInTheDocument()
  })
  it('composes Rating and PrincipleTag and exposes them through data attributes', () => {
    const { container } = render(<WcagCard code="2.1.1" title="Keyboard" rating="AA" principle="operable" />)
    expect(container.querySelector('.bb-wcag-card')?.getAttribute('data-rating')).toBe('AA')
    expect(container.querySelector('.bb-rating')?.getAttribute('data-rating')).toBe('AA')
    expect(container.querySelector('.bb-principle-tag')?.getAttribute('data-principle')).toBe('operable')
  })
  it('shows one DisabilityIndicator per Figma boolean, defaulting to all four', () => {
    const { container, rerender } = render(<WcagCard code="x" title="y" />)
    expect(container.querySelectorAll('.bb-wcag-card__indicator')).toHaveLength(4)
    rerender(<WcagCard code="x" title="y" disabilities={['visual']} />)
    expect(container.querySelectorAll('.bb-wcag-card__indicator')).toHaveLength(1)
    expect(container.querySelector('.bb-wcag-card__indicator')?.getAttribute('data-kind')).toBe('visual')
  })
  it('renders the colour sample and the ratio badge from colors + ratio', () => {
    const { container } = render(<WcagCard code="x" title="y" colors={{ fg: '#8fb7e8', bg: '#0c8ce9' }} ratio={{ value: '2.4:1', requirement: 'needs 4.5:1' }} />)
    expect(container.querySelector('.bb-wcag-card__sample')).toBeInTheDocument()
    expect(screen.getByText('Sample of this exact pair')).toBeInTheDocument()
    expect(container.querySelector('.bb-wcag-card__ratio-mark')?.textContent).toBe('\u2715')
    expect(container.querySelector('.bb-wcag-card__ratio-value')?.textContent).toContain('2.4:1')
  })
  it('renders the "Check With" indicators and fires the footer actions', async () => {
    const calls: string[] = []
    const { container } = render(<WcagCard code="x" title="y" onIgnore={() => calls.push('ignore')} onAnnotate={() => calls.push('annotate')} onSelect={() => calls.push('select')} />)
    expect(container.querySelectorAll('.bb-wcag-card__check')).toHaveLength(3)
    for (const name of ['Ignore', 'Annotation', 'Select in Figma']) screen.getByRole('button', { name }).click()
    expect(calls).toEqual(['ignore', 'annotate', 'select'])
  })
  it('renders the detail rows, colour swatches and ThemeChips when given', () => {
    const { container } = render(
      <WcagCard code="x" title="y" node="Label (TEXT)" colors={{ fg: '#8fb7e8', bg: '#0c8ce9' }} whyItFails="Too light." howToFix="Darken it." themes={['forms', 'keyboard']} link={{ label: 'Understanding', href: 'https://w3.org' }} />,
    )
    expect(screen.getByText('Label (TEXT)')).toBeInTheDocument()
    expect(screen.getByText('#8FB7E8')).toBeInTheDocument()
    expect(screen.getByText('#0C8CE9')).toBeInTheDocument()
    expect(container.querySelectorAll('.bb-wcag-card__swatch')).toHaveLength(2)
    expect(screen.getByText('Too light.')).toBeInTheDocument()
    expect(container.querySelectorAll('.bb-theme-chip')).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'Understanding' })).toHaveAttribute('href', 'https://w3.org')
  })
  it('draws the Line 64 rule between the Fix row and the snippet in colours mode only', () => {
    const fix = { value: '#ffffff', ratio: '5.12:1' }
    const snippet = { code: 'color: var(--text-on-accent);' }
    const { container, rerender } = render(<WcagCard code="x" title="y" fix={fix} snippet={snippet} />)
    const rule = container.querySelector('.bb-wcag-card__body > .bb-wcag-card__divider--fix')
    expect(rule).toBeInTheDocument()
    expect(rule?.tagName).toBe('HR')
    expect(rule?.previousElementSibling).toHaveClass('bb-fix-row')
    expect(rule?.nextElementSibling).toHaveClass('bb-code-snippet')
    rerender(<WcagCard code="x" title="y" mode="text" fix={fix} snippet={snippet} />)
    expect(container.querySelector('.bb-wcag-card__divider--fix')).toBeNull()
  })
  it('leaves out the Line 64 rule when no Fix row sits above it', () => {
    const { container, rerender } = render(<WcagCard code="x" title="y" />)
    expect(container.querySelector('.bb-wcag-card__divider--fix')).toBeNull()
    rerender(<WcagCard code="x" title="y" snippet={{ code: 'color: red;' }} />)
    expect(container.querySelector('.bb-wcag-card__divider--fix')).toBeNull()
  })
  it('draws the Line 62 rule above the brand-mode matrix only', () => {
    const { container, rerender } = render(<WcagCard code="x" title="y" />)
    expect(container.querySelector('.bb-wcag-card__divider--brand-modes')).toBeNull()
    rerender(<WcagCard code="x" title="y" brandModes={[{ brand: 'Bridge', pass: true, ratio: '7.1:1' }]} />)
    const rule = container.querySelector('.bb-wcag-card__sections > .bb-wcag-card__divider--brand-modes')
    expect(rule?.nextElementSibling).toHaveClass('bb-brand-modes')
  })
  it('hides the brand-mode matrix and its Line 62 rule in mode="text", as Figma does', () => {
    const { container } = render(<WcagCard code="x" title="y" mode="text" brandModes={[{ brand: 'Bridge', pass: true, ratio: '7.1:1' }]} />)
    expect(container.querySelector('.bb-wcag-card__divider--brand-modes')).toBeNull()
    expect(container.querySelector('.bb-brand-modes')).toBeNull()
  })
  it('renders the placeholder slot only when a preview is supplied', () => {
    const { container, rerender } = render(<WcagCard code="x" title="y" />)
    expect(container.querySelector('.bb-wcag-card__placeholder')).toBeNull()
    rerender(<WcagCard code="x" title="y" preview={<img alt="shot" />} />)
    expect(container.querySelector('.bb-wcag-card__placeholder')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'shot' })).toBeInTheDocument()
  })
})

/** The eleven card-level gaps from the 2026-09-23 market analysis. Each one is
 * opt-in: absent props must leave the Figma-faithful card untouched. */
describe('WcagCard — analysis gaps', () => {
  it('1. mode="text" swaps the colour sample for type metrics', () => {
    const metrics = { size: '14px', weight: '400', lineHeight: '20px', largeText: false }
    const { container } = render(
      <WcagCard code="1.4.3" title="t" mode="text" metrics={metrics} colors={{ fg: '#111111', bg: '#222222' }} />,
    )
    expect(container.querySelector('.bb-wcag-card__sample')).toBeNull()
    expect(container.querySelector('.bb-metrics-panel')).toBeInTheDocument()
    expect(screen.getByText('Line height')).toBeInTheDocument()
    expect(screen.getByText('Body text (4.5:1)')).toBeInTheDocument()
  })
  it('1b. the metrics panel also rides along in colours mode', () => {
    const { container } = render(
      <WcagCard code="1.4.3" title="t" metrics={{ size: '13px' }} colors={{ fg: '#111111', bg: '#222222' }} />,
    )
    expect(container.querySelector('.bb-wcag-card__sample')).toBeInTheDocument()
    expect(container.querySelector('.bb-metrics-panel')).toBeInTheDocument()
  })
  it('2. renders the suggested fix and fires onApply', () => {
    const calls: string[] = []
    const { container } = render(
      <WcagCard code="x" title="y" colors={{ fg: '#8fb7e8', bg: '#0c8ce9' }}
        fix={{ token: { name: 'Brand/Text/OnAccent', mode: 'Bridge' }, value: '#ffffff', ratio: '5.12:1', onApply: () => calls.push('apply') }} />,
    )
    expect(container.querySelector('.bb-fix-row')).toBeInTheDocument()
    expect(screen.getByText('Brand/Text/OnAccent')).toBeInTheDocument()
    expect(screen.getByText('5.12:1')).toBeInTheDocument()
    screen.getByRole('button', { name: 'Apply' }).click()
    expect(calls).toEqual(['apply'])
  })
  it('2b. keeps the fix out of text mode, where Figma hides the Fix row', () => {
    const { container } = render(<WcagCard code="x" title="y" mode="text" fix={{ value: '#ffffff', ratio: '5.12:1' }} />)
    expect(container.querySelector('.bb-fix-row')).toBeNull()
  })
  it('3. shows the variable behind each hex', () => {
    const { container } = render(
      <WcagCard code="x" title="y" node="Label" nodeToken={{ name: 'Brand/Text/Secondary' }}
        colors={{ fg: '#8fb7e8', bg: '#0c8ce9', fgToken: { name: 'Brand/Text/Muted', mode: 'Bridge' } }} />,
    )
    expect(container.querySelectorAll('.bb-token-ref')).toHaveLength(2)
    expect(screen.getByText('Brand/Text/Muted')).toBeInTheDocument()
    expect(screen.getByText('Bridge')).toBeInTheDocument()
  })
  it('4. judges the pair in every brand mode', () => {
    const { container } = render(
      <WcagCard code="x" title="y" brandModes={[
        { brand: 'Bridge', pass: false, ratio: '2.4:1', current: true },
        { brand: 'Ikea', pass: true, ratio: '7.1:1' },
      ]} />,
    )
    const modes = container.querySelectorAll('.bb-brand-mode-chip')
    expect(modes).toHaveLength(2)
    expect(modes[0]?.getAttribute('data-current')).toBe('true')
    expect(modes[0]?.getAttribute('data-pass')).toBeNull()
    expect(modes[1]?.getAttribute('data-pass')).toBe('true')
  })
  it('5. ranks severity and rolls up repeated layers', () => {
    const calls: string[] = []
    const { container } = render(
      <WcagCard code="x" title="y" severity="critical" occurrences={{ count: 37, onSelectAll: () => calls.push('all') }} />,
    )
    expect(container.querySelector('.bb-wcag-card')?.getAttribute('data-severity')).toBe('critical')
    expect(screen.getByText('Critical')).toBeInTheDocument()
    expect(screen.getByText('×37')).toBeInTheDocument()
    screen.getByRole('button', { name: 'Select all' }).click()
    expect(calls).toEqual(['all'])
  })
  it('6. records why an ignore was made and offers a restore', () => {
    const calls: string[] = []
    const { container } = render(
      <WcagCard code="x" title="y" ignored={{ reason: 'Decorative watermark', scope: 'pair', author: 'Praveen', expires: 'until 2026-12-01', onUndo: () => calls.push('undo') }} />,
    )
    expect(container.querySelector('.bb-wcag-card')?.getAttribute('data-ignored')).toBe('true')
    expect(screen.getByRole('note')).toBeInTheDocument()
    expect(screen.getByText('Decorative watermark')).toBeInTheDocument()
    expect(screen.getByText('Applies to this colour pair')).toBeInTheDocument()
    expect(screen.getByText('until 2026-12-01')).toBeInTheDocument()
    screen.getByRole('button', { name: 'Restore' }).click()
    expect(calls).toEqual(['undo'])
  })
  it('7. reflects the annotation lifecycle on the footer button', () => {
    const { rerender } = render(<WcagCard code="x" title="y" onAnnotate={() => undefined} />)
    expect(screen.getByRole('button', { name: 'Annotation' })).toBeEnabled()
    rerender(<WcagCard code="x" title="y" onAnnotate={() => undefined} annotation={{ state: 'queued' }} />)
    expect(screen.getByRole('button', { name: 'Annotating…' })).toBeDisabled()
    rerender(<WcagCard code="x" title="y" onAnnotate={() => undefined} annotation={{ state: 'placed', target: 'Dev Mode' }} />)
    expect(screen.getByRole('button', { name: 'Annotated' })).toHaveAttribute('title', 'Annotate in Dev Mode')
  })
  it('8. turns the "Check With" icons into a real review list', () => {
    const calls: [number, boolean][] = []
    const { container } = render(
      <WcagCard code="x" title="y" onToggleManualCheck={(i, done) => calls.push([i, done])} manualChecks={[
        { kind: 'content', label: 'Alt text conveys the same meaning', done: true },
        { kind: 'code', label: 'Focus ring is visible at 3:1' },
      ]} />,
    )
    expect(container.querySelectorAll('.bb-manual-review-item')).toHaveLength(2)
    expect(screen.getByText('1/2')).toBeInTheDocument()
    screen.getByRole('checkbox', { name: 'Focus ring is visible at 3:1' }).click()
    expect(calls).toEqual([[1, true]])
  })
  it('9. fills the placeholder with before/after thumbnails', () => {
    const { container } = render(
      <WcagCard code="x" title="y" thumbnail={{ src: 'before.png', alt: 'current' }} thumbnailAfter={{ src: 'after.png', alt: 'fixed' }} />,
    )
    expect(container.querySelector('.bb-thumbnail-pair')?.getAttribute('data-pair')).toBe('true')
    expect(screen.getByRole('img', { name: 'current' })).toBeInTheDocument()
    expect(screen.getByText('Before')).toBeInTheDocument()
    expect(screen.getByText('After')).toBeInTheDocument()
  })
  it('10. marks how the finding moved since the last scan', () => {
    const { container } = render(<WcagCard code="x" title="y" change="regressed" lastSeen="passed on 21 Sep" />)
    expect(container.querySelector('.bb-wcag-card')?.getAttribute('data-change')).toBe('regressed')
    expect(screen.getByText('Regressed')).toBeInTheDocument()
    expect(screen.getByText('passed on 21 Sep')).toBeInTheDocument()
  })
  it('11. carries a copyable implementation snippet', () => {
    const calls: string[] = []
    const { container } = render(
      <WcagCard code="x" title="y" snippet={{ language: 'CSS', code: 'color: var(--text-on-accent);', onCopy: () => calls.push('copy') }} />,
    )
    expect(screen.getByText('CSS')).toBeInTheDocument()
    expect(container.querySelector('.bb-code-snippet__code')?.textContent).toContain('--text-on-accent')
    screen.getByRole('button', { name: 'Copy snippet' }).click()
    expect(calls).toEqual(['copy'])
  })
  it('leaves the Figma-faithful card untouched when no gap prop is passed', () => {
    const { container } = render(<WcagCard code="1.4.3" title="Contrast (Minimum)" colors={{ fg: '#8fb7e8', bg: '#0c8ce9' }} />)
    for (const cls of [
      '.bb-fix-row', '.bb-brand-modes', '.bb-metrics-panel', '.bb-manual-review',
      '.bb-code-snippet', '.bb-ignore-banner', '.bb-thumbnail-pair', '.bb-meta-badge',
      '.bb-occurrences', '.bb-token-ref',
    ]) {
      expect(container.querySelector(cls)).toBeNull()
    }
    expect(container.querySelector('.bb-wcag-card__sample')).toBeInTheDocument()
  })

  it('renders each check type\'s preview only in its own mode', () => {
    const typeCompare = { current: { size: 13, lineHeight: 16 }, suggested: { size: 16, lineHeight: 24 } }
    const target = { width: 18, height: 18, spacing: 4 }
    const vision = { colors: { a: '#D93025', b: '#1E8E3E' } }
    const { container, rerender } = render(<WcagCard code="x" title="y" mode="touch" typeCompare={typeCompare} target={target} vision={vision} />)
    expect(container.querySelector('.bb-target-preview')).toBeInTheDocument()
    expect(container.querySelector('.bb-type-compare')).toBeNull()
    expect(container.querySelector('.bb-vision-sim-grid')).toBeNull()
    rerender(<WcagCard code="x" title="y" mode="vision" typeCompare={typeCompare} target={target} vision={vision} />)
    expect(container.querySelectorAll('.bb-vision-sim-tile')).toHaveLength(6)
    expect(container.querySelector('.bb-target-preview')).toBeNull()
    rerender(<WcagCard code="x" title="y" mode="text" typeCompare={typeCompare} target={target} vision={vision} />)
    expect(container.querySelector('.bb-type-compare')).toBeInTheDocument()
    rerender(<WcagCard code="x" title="y" mode="colors" typeCompare={typeCompare} target={target} vision={vision} />)
    expect(container.querySelector('.bb-wcag-card__check-preview')).toBeNull()
  })

  it('keeps the colour-only sections out of touch and vision mode', () => {
    const { container } = render(
      <WcagCard code="x" title="y" mode="touch" colors={{ fg: '#fff', bg: '#000' }} ratio={{ value: '2:1' }} fix={{ value: '#fff', ratio: '5:1' }}
        brandModes={[{ brand: 'Bridge', ratio: '2:1', pass: false }]} />,
    )
    expect(container.querySelector('.bb-wcag-card__preview')).toBeNull()
    expect(container.querySelector('.bb-fix-row')).toBeNull()
    expect(container.querySelector('.bb-brand-modes')).toBeNull()
  })
})
