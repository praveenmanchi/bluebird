import type { Meta, StoryObj } from '@storybook/preact-vite'
import { StatusPill } from './StatusPill'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Atoms/StatusPill',
  component: StatusPill,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: { status: { control: 'inline-radio', options: ['good', 'issue', 'error', 'retry'] } },
  args: { status: 'good', children: 'Value' },
} satisfies Meta<typeof StatusPill>
export default meta
type Story = StoryObj<typeof meta>

export const ButtomStatus: Story = { parameters: { figma: { variant: 'Buttom Status' } } }
export const Issue: Story = { args: { status: 'issue', children: '3 issues' } }
export const ErrorStatus: Story = { args: { status: 'error', children: 'Failed' } }
export const Retry: Story = { args: { status: 'retry', children: 'Retrying' } }

export const AcrossBrands: Story = {
  render: () => (
    <BrandGrid>
      <StatusPill status="good">Connected</StatusPill>
      <StatusPill status="issue">3 issues</StatusPill>
      <StatusPill status="error">Failed</StatusPill>
      <StatusPill status="retry">Retrying</StatusPill>
    </BrandGrid>
  ),
}
