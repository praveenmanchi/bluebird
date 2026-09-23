import type { Meta, StoryObj } from '@storybook/preact-vite'
import { Occurrences } from './Occurrences'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/Occurrences',
  component: Occurrences,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { count: 37, onSelectAll: () => undefined },
} satisfies Meta<typeof Occurrences>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'Occurrences' } } }
export const ReadOnly: Story = { args: { onSelectAll: undefined } }
export const AcrossBrands: Story = { render: (args) => <BrandGrid><Occurrences {...args} /></BrandGrid> }
