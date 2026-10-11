import type { Meta, StoryObj } from '@storybook/preact-vite'
import { useState } from 'preact/hooks'
import { SegmentedControl } from './SegmentedControl'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const FOUR = ['Multi Inspect', 'Label', 'Label 2', 'Label 3']
const THREE = ['Multi Inspect', 'Label', 'Label 2']
const TWO = ['Label', 'Label 2']
// Every segment in both Figma variants carries the Tab Icons "text" glyph (master 287:46071).
const textIcons = (options: readonly string[]) => Object.fromEntries(options.map((o) => [o, 'text' as const]))

const meta = {
  title: 'Molecules/SegmentedControl',
  component: SegmentedControl,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { options: FOUR, value: FOUR[0] },
} satisfies Meta<typeof SegmentedControl>
export default meta
type Story = StoryObj<typeof meta>

export const FourLevel: Story = { args: { icons: textIcons(FOUR) }, parameters: { figma: { variant: 'Property 1=4 level' } } }
export const ThreeLevel: Story = { args: { options: THREE, value: THREE[0], icons: textIcons(THREE) }, parameters: { figma: { variant: 'Property 1=3 level' } } }
export const TwoLevel: Story = { args: { options: TWO, value: TWO[0], icons: textIcons(TWO) }, parameters: { figma: { variant: 'Property 1=2 level' } } }
export const WithIcons: Story = { args: { options: ['JSON', 'CSS', 'Tokens'], value: 'JSON', icons: { JSON: 'text', CSS: 'colors', Tokens: 'variables' } } }
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
      <SegmentedControl {...args} options={TWO} value={TWO[0]} />
    </BrandGrid>
  ),
}
