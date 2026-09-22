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

export const Default: Story = { parameters: { figma: { variant: 'WCAG Card' } } }
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
