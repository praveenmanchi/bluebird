import type { Meta, StoryObj } from '@storybook/preact-vite'
import { MetricsPanel } from './MetricsPanel'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/MetricsPanel',
  component: MetricsPanel,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: {
    metrics: [
      { label: 'Size', value: '13px' },
      { label: 'Weight', value: '400 Regular' },
      { label: 'Line height', value: '16px (1.23)' },
      { label: 'Letter spacing', value: '0px' },
      { label: 'Measure', value: '96 characters' },
      { label: 'Threshold', value: 'Body text (4.5:1)' },
    ],
  },
} satisfies Meta<typeof MetricsPanel>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'Metrics Panel' } } }
export const AcrossBrands: Story = { render: (args) => <BrandGrid width="437px"><MetricsPanel {...args} /></BrandGrid> }
