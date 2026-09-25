import type { Meta, StoryObj } from '@storybook/preact-vite'
import { BrandModeChip } from './BrandModeChip'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Atoms/BrandModeChip',
  component: BrandModeChip,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { brand: 'Bridge', pass: false, current: false, ratio: '2.4:1' },
} satisfies Meta<typeof BrandModeChip>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const Fail: Story = { parameters: v('State=Fail, Current=No') }
export const FailCurrent: Story = { args: { current: true }, parameters: v('State=Fail, Current=Yes') }
export const Pass: Story = { args: { brand: 'Ikea', pass: true, ratio: '7.1:1' }, parameters: v('State=Pass, Current=No') }
export const PassCurrent: Story = { args: { brand: 'Ikea', pass: true, current: true, ratio: '7.1:1' }, parameters: v('State=Pass, Current=Yes') }
export const AcrossBrands: Story = { render: (args) => <BrandGrid><BrandModeChip {...args} /></BrandGrid> }
