import type { Meta, StoryObj } from '@storybook/preact-vite'
import { useState } from 'preact/hooks'
import { SearchBar } from './SearchBar'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/SearchBar',
  component: SearchBar,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { value: '', placeholder: 'Enter Variables here' },
} satisfies Meta<typeof SearchBar>
export default meta
type Story = StoryObj<typeof meta>

/** The single Figma variant: empty query showing the placeholder. */
export const Default: Story = { parameters: { figma: { variant: 'search bar' } } }

export const WithValue: Story = { args: { value: 'color/primary' } }
export const Disabled: Story = { args: { disabled: true } }

export const Interactive: Story = {
  render: (args) => {
    const [value, setValue] = useState(args.value ?? '')
    return <SearchBar {...args} value={value} onValueChange={setValue} />
  },
}

export const AcrossBrands: Story = {
  render: (args) => (
    <BrandGrid width="320px">
      <SearchBar {...args} />
      <SearchBar {...args} value="spacing/inset" />
    </BrandGrid>
  ),
}
