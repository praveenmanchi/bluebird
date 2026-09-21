import type { Meta, StoryObj } from '@storybook/preact-vite'
import { InfoMeta } from './InfoMeta'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/InfoMeta',
  component: InfoMeta,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { items: ['20m', 'V2.11.0'] },
} satisfies Meta<typeof InfoMeta>
export default meta
type Story = StoryObj<typeof meta>

export const Info: Story = { parameters: { figma: { variant: 'info' } } }
export const SingleSegment: Story = { args: { items: ['Just now'] } }

export const AcrossBrands: Story = {
  render: (args) => (
    <BrandGrid>
      <InfoMeta {...args} />
      <InfoMeta {...args} items={['2h', 'V3.0.0', 'beta']} />
    </BrandGrid>
  ),
}
