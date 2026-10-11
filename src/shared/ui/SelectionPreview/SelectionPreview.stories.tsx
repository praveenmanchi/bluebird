import type { Meta, StoryObj } from '@storybook/preact-vite'
import { SelectionPreview } from './SelectionPreview'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Organisms/SelectionPreview',
  component: SelectionPreview,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
} satisfies Meta<typeof SelectionPreview>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'Selection Preview' } } }
export const OtherSelection: Story = {
  args: {
    name: 'Checkout · Payment',
    meta: 'Frame · 1440×900 · Checkout flow',
    stats: [{ label: '42 variables', tone: 'accent' }, { label: '12 components' }, { label: '3 raw values', tone: 'warning' }],
  },
}

export const AcrossBrands: Story = {
  render: () => <BrandGrid width="620px"><SelectionPreview /></BrandGrid>,
}
