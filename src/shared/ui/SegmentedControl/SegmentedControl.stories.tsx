import type { Meta, StoryObj } from '@storybook/preact-vite'
import { useState } from 'preact/hooks'
import { SegmentedControl, type SegmentOption } from './SegmentedControl'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

// The sample items on the Figma set: Item 1 is Selected, each with its own UI Icons glyph.
const SAMPLE: readonly SegmentOption[] = [
  { value: 'Label', icon: 'ui-variable-text' },
  { value: 'JSON', icon: 'ui-toolbar-dev-brackets' },
  { value: 'XML', icon: 'ui-text-code-block' },
  { value: 'YAML', icon: 'ui-text-codesnippet' },
  { value: 'CSS', icon: 'ui-style-fill' },
  { value: 'Markdown', icon: 'ui-text-h1' },
]
const level = (n: number) => SAMPLE.slice(0, n)

const meta = {
  title: 'Molecules/SegmentedControl',
  component: SegmentedControl,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { options: level(4), value: 'Label' },
} satisfies Meta<typeof SegmentedControl>
export default meta
type Story = StoryObj<typeof meta>

export const Level2: Story = { args: { options: level(2) }, parameters: { figma: { variant: 'Level=2' } } }
export const Level3: Story = { args: { options: level(3) }, parameters: { figma: { variant: 'Level=3' } } }
export const Level4: Story = { parameters: { figma: { variant: 'Level=4' } } }
export const Level5: Story = { args: { options: level(5) }, parameters: { figma: { variant: 'Level=5' } } }
export const Level6: Story = { args: { options: level(6) }, parameters: { figma: { variant: 'Level=6' } } }
/** Accessibility S: the compact filter without glyphs. */
export const TextOnly: Story = { args: { options: ['All 23', 'Contrast 14', 'Non-text 5', 'Target size 4'], value: 'All 23' } }
export const Disabled: Story = { args: { disabled: true } }

export const Interactive: Story = {
  render: (args) => {
    const [value, setValue] = useState(args.value)
    return <SegmentedControl {...args} value={value} onChange={setValue} />
  },
}

export const AcrossBrands: Story = {
  render: (args) => (
    <BrandGrid width="400px">
      <SegmentedControl {...args} />
      <SegmentedControl {...args} options={level(2)} />
    </BrandGrid>
  ),
}
