import type { Meta, StoryObj } from '@storybook/preact-vite'
import { WcagCard } from './WcagCard'
import { figma } from './figma'
import { BrandGrid, VariantGrid } from '../../../../.storybook/helpers'
import type { Principle } from '../PrincipleTag/PrincipleTag'
import type { RatingLevel } from '../Rating/Rating'

const meta = {
  title: 'Organisms/WcagCard',
  component: WcagCard,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: {
    rating: { control: 'inline-radio', options: ['A', 'AA', 'AAA'] },
    principle: { control: 'inline-radio', options: ['perceivable', 'operable', 'understandable', 'robust'] },
  },
  args: {
    code: '1.4.3',
    title: 'Contrast (Minimum)',
    description: 'A visible indicator must show which element is currently focused when navigating with a keyboard.',
    rating: 'A',
    principle: 'perceivable',
    disabilities: ['auditory', 'cognitive', 'physical', 'visual'],
    link: { label: 'Understanding SC 1.4.3 ↗', href: 'https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum' },
    node: 'Label (TEXT)',
    colors: { fg: '#8FB7E8', bg: '#0C8CE9' },
    actual: '2.4:1',
    required: '4.5:1 (AA)',
    whyItFails: 'Body text must reach a 4.5:1 contrast ratio against its background.',
    howToFix: 'Use white label text or darken the fill to reach 4.5:1.',
    themes: ['forms', 'gestures', 'keyboard'],
    ratio: { value: '2.4:1', requirement: 'needs 4.5:1' },
    checks: ['content', 'design', 'code'],
    onIgnore: () => undefined,
    onAnnotate: () => undefined,
    onSelect: () => undefined,
  },
} satisfies Meta<typeof WcagCard>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'Mode=colors' } } }
export const VisualOnly: Story = { args: { disabilities: ['visual'] } }
export const Passing: Story = { args: { ratio: { value: '7.1:1', requirement: 'needs 4.5:1', pass: true }, colors: { fg: '#FFFFFF', bg: '#0B3D91' } } }
export const Minimal: Story = { args: { description: undefined, link: undefined, node: undefined, colors: undefined, actual: undefined, required: undefined, whyItFails: undefined, howToFix: undefined, themes: [], ratio: undefined, checks: [], onIgnore: undefined, onAnnotate: undefined, onSelect: undefined } }

export const Matrix: Story = {
  render: (args) => (
    <VariantGrid columns={['A', 'AA', 'AAA']} rows={['perceivable', 'operable', 'understandable', 'robust']}>
      {(row, col) => <WcagCard {...args} principle={row as Principle} rating={col as RatingLevel} themes={[]} node={undefined} colors={undefined} actual={undefined} required={undefined} whyItFails={undefined} howToFix={undefined} ratio={undefined} style={{ width: '300px' }} />}
    </VariantGrid>
  ),
}

export const AcrossBrands: Story = {
  render: (args) => (
    <BrandGrid width="500px">
      <WcagCard {...args} />
    </BrandGrid>
  ),
}

/* ---------------------------------------------------------------------------
 * The eleven card-level gaps from the 2026-09-23 market analysis. Figma has
 * since caught up on most of them inside `Mode=colors` (40000141:9570), but
 * none is a variant of its own, so they carry no `parameters.figma.variant` —
 * the Figma coverage list stays honest.
 * ------------------------------------------------------------------------ */

/** Gap 1 — `Mode=Text` drops the swatch sample; the metrics panel carries the finding. */
export const TextMode: Story = {
  parameters: { figma: { variant: 'Mode=Text' } },
  args: {
    mode: 'text',
    code: '1.4.8',
    title: 'Visual Presentation',
    metrics: { size: '13px', weight: '400 Regular', lineHeight: '16px (1.23)', letterSpacing: '0px', measure: '96 characters', largeText: false },
    required: 'Line height ≥ 1.5 · measure ≤ 80 characters',
    actual: 'Line height 1.23 · 96 characters',
    typeCompare: { current: { size: 13, lineHeight: 16 }, suggested: { size: 16, lineHeight: 24 } },
  },
}

/** Figma Mode=Touch target — the hit-area diagram replaces the colour sample. */
export const TouchMode: Story = {
  parameters: { figma: { variant: 'Mode=Touch target' } },
  args: {
    mode: 'touch',
    code: '2.5.8',
    title: 'Target Size (Minimum)',
    description: 'The size of the target for pointer inputs is at least 24 by 24 CSS pixels, or the target has enough space around it.',
    rating: 'AA',
    principle: 'operable',
    disabilities: ['physical'],
    node: 'Close button',
    colors: undefined,
    ratio: undefined,
    actual: '18 × 18px, 4px from Info',
    required: '24 × 24px, or 24px spacing',
    whyItFails: 'A 24px circle centred on the close icon overlaps the Info button.',
    howToFix: 'Pad the button to 24 × 24 (3px each side) or move Info 24px away.',
    themes: ['gestures'],
    target: { width: 18, height: 18, spacing: 4 },
    link: { label: 'Understanding SC 2.5.8 ↗', href: 'https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html' },
  },
}

/** Figma Mode=Vision — six colour-vision simulations of a hue-only pair (1.4.1 Use of Color). */
export const VisionMode: Story = {
  parameters: { figma: { variant: 'Mode=Vision' } },
  args: {
    mode: 'vision',
    code: '1.4.1',
    title: 'Use of Color',
    description: 'Colour is not the only visual means of conveying information, indicating an action, or distinguishing an element.',
    rating: 'A',
    disabilities: ['visual'],
    node: 'Status badge',
    colors: { fg: '#D93025', bg: '#1E8E3E' },
    ratio: undefined,
    actual: 'Error and Success differ only by hue',
    required: 'A second cue: icon, text or pattern',
    whyItFails: 'Red and green badges look the same with protanopia, deuteranopia and achromatopsia.',
    howToFix: 'Add ✕ / ✓ icons or the words Error / Success to each badge.',
    vision: { colors: { a: '#D93025', b: '#1E8E3E', bg: '#FFFFFF' } },
    link: { label: 'Understanding SC 1.4.1 ↗', href: 'https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html' },
  },
}

/** Gap 2 + 3 — the nearest passing token, with one click to bind it. */
export const SuggestedFix: Story = {
  args: {
    node: 'Label (TEXT)',
    nodeToken: { name: 'Brand/Text/Secondary', mode: 'Bridge' },
    colors: { fg: '#8FB7E8', bg: '#0C8CE9', fgToken: { name: 'Brand/Text/Secondary', mode: 'Bridge' }, bgToken: { name: 'Brand/Surface/Accent', mode: 'Bridge' } },
    fix: { token: { name: 'Brand/Text/OnAccent', mode: 'Bridge' }, value: '#FFFFFF', ratio: '5.12:1', onApply: () => undefined },
  },
}

/** Gap 4 — the one check no competitor can make. */
export const BrandModeMatrix: Story = {
  args: {
    brandModes: [
      { brand: 'Bridge', pass: false, ratio: '2.4:1', current: true },
      { brand: 'Ikea', pass: true, ratio: '7.1:1' },
      { brand: 'Richemont', pass: true, ratio: '5.8:1' },
      { brand: 'Disney', pass: false, ratio: '3.1:1' },
      { brand: 'Fiskars', pass: true, ratio: '8.4:1' },
    ],
  },
}

/** Gap 5 + 10 — triage: impact, roll-up, and movement since the last scan. */
export const Triage: Story = {
  args: {
    severity: 'critical',
    change: 'regressed',
    lastSeen: 'passed on 21 Sep',
    occurrences: { count: 37, onSelectAll: () => undefined },
  },
}

/** Gap 6 — an ignore with a reason, a scope, an author and an expiry. */
export const Ignored: Story = {
  args: {
    ignored: { reason: 'Decorative watermark, exempt under 1.4.3', scope: 'pair', author: 'Praveen', expires: 'expires 2026-12-01', onUndo: () => undefined },
  },
}

/** Gap 7 — the annotation button reports where the annotation is. */
export const Annotated: Story = {
  args: { annotation: { state: 'placed', target: 'Dev Mode' } },
}

/** Gap 8 + 11 — what a machine cannot decide, and what the developer types. */
export const HandoffReady: Story = {
  args: {
    manualChecks: [
      { kind: 'content', label: 'The label still reads correctly at 200% zoom', done: true },
      { kind: 'design', label: 'Focus ring reaches 3:1 against both neighbours' },
      { kind: 'code', label: 'Colour is not the only signal for the error state' },
    ],
    onToggleManualCheck: () => undefined,
    snippet: { language: 'CSS', code: '.field__label {\n  color: var(--brand-text-on-accent);\n}', onCopy: () => undefined },
  },
}

/** Gap 9 — the placeholder rectangle, filled with the node itself. */
export const BeforeAfter: Story = {
  args: {
    thumbnail: { src: 'https://placehold.co/240x96/0C8CE9/8FB7E8/png?text=Before', alt: 'Label as drawn today' },
    thumbnailAfter: { src: 'https://placehold.co/240x96/0C8CE9/FFFFFF/png?text=After', alt: 'Label with the suggested token' },
  },
}

/** All eleven at once — the card at its fullest. */
export const Everything: Story = {
  args: {
    ...SuggestedFix.args,
    metrics: TextMode.args?.metrics,
    ...BrandModeMatrix.args,
    ...Triage.args,
    ...Annotated.args,
    ...HandoffReady.args,
    ...BeforeAfter.args,
  },
}
