import type { Meta, StoryObj } from '@storybook/preact-vite'
import { StatTile } from './StatTile'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/StatTile',
  component: StatTile,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { value: 68, label: 'Variables', icon: 'variables' },
} satisfies Meta<typeof StatTile>
export default meta
type Story = StoryObj<typeof meta>

export const Dashboard: Story = { parameters: { figma: { variant: 'Dashboard' } } }
export const OtherGlyph: Story = { args: { value: 12, label: 'Components', icon: 'component' } }

export const AcrossBrands: Story = {
  render: (args) => (
    <BrandGrid>
      <StatTile {...args} />
      <StatTile {...args} value={3} label="Colors" icon="colors" />
    </BrandGrid>
  ),
}
