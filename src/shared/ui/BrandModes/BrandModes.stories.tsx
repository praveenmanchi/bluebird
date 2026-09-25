import type { Meta, StoryObj } from '@storybook/preact-vite'
import { BrandModes } from './BrandModes'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/BrandModes',
  component: BrandModes,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: {
    modes: [
      { brand: 'Bridge', pass: false, ratio: '2.4:1', current: true },
      { brand: 'Ikea', pass: true, ratio: '7.1:1' },
      { brand: 'Richemont', pass: true, ratio: '5.8:1' },
      { brand: 'Disney', pass: false, ratio: '3.1:1' },
      { brand: 'Fiskars', pass: true, ratio: '8.4:1' },
    ],
  },
} satisfies Meta<typeof BrandModes>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'Brand Modes' } } }
export const AllPassing: Story = {
  args: { modes: [{ brand: 'Bridge', pass: true, ratio: '5.2:1', current: true }, { brand: 'Ikea', pass: true, ratio: '7.1:1' }] },
}
export const AcrossBrands: Story = { render: (args) => <BrandGrid width="437px"><BrandModes {...args} /></BrandGrid> }
