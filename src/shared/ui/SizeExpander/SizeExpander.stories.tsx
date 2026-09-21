import type { Meta, StoryObj } from '@storybook/preact-vite'
import { useState } from 'preact/hooks'
import { SizeExpander, type SizeExpanderValue } from './SizeExpander'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/SizeExpander',
  component: SizeExpander,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: { value: { control: 'inline-radio', options: ['S', 'M', 'L'] } },
  args: { value: 'M' },
} satisfies Meta<typeof SizeExpander>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'size expander' } } }

export const Interactive: Story = {
  render: (args) => {
    const [value, setValue] = useState<SizeExpanderValue>(args.value ?? 'M')
    return <SizeExpander {...args} value={value} onChange={setValue} />
  },
}

export const AcrossBrands: Story = {
  render: (args) => (
    <BrandGrid>
      <SizeExpander {...args} />
      <SizeExpander {...args} value="L" />
      <SizeExpander {...args} disabled />
    </BrandGrid>
  ),
}
