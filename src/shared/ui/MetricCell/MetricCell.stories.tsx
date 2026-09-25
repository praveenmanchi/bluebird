import type { Meta, StoryObj } from '@storybook/preact-vite'
import { MetricCell } from './MetricCell'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Atoms/MetricCell',
  component: MetricCell,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { label: 'Line height', children: '16px (1.23)' },
} satisfies Meta<typeof MetricCell>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'Metric Cell' } } }
export const AcrossBrands: Story = { render: (args) => <BrandGrid><MetricCell {...args} /></BrandGrid> }
