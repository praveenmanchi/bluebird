import type { Meta, StoryObj } from '@storybook/preact-vite'
import { FixRow } from './FixRow'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/FixRow',
  component: FixRow,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: {
    label: 'Rebind to Brand/Text/OnAccent',
    hex: '#FFFFFF',
    on: '#0C8CE9',
    ratio: '5.12:1',
    onApply: () => undefined,
  },
} satisfies Meta<typeof FixRow>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'Fix Row' } } }
export const ReadOnly: Story = { args: { onApply: undefined } }
export const AcrossBrands: Story = { render: (args) => <BrandGrid width="437px"><FixRow {...args} /></BrandGrid> }
