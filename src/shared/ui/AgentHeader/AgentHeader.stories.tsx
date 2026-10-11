import type { Meta, StoryObj } from '@storybook/preact-vite'
import { AgentHeader } from './AgentHeader'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Organisms/AgentHeader',
  component: AgentHeader,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
} satisfies Meta<typeof AgentHeader>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'Agent Header' } } }
export const Idle: Story = {
  args: { agent: 'writing', botState: 'sleeping', name: 'Writing agent', purpose: 'Checks tone, clarity and terminology against your UX writing guide.', chips: ['Voice & tone · 32 rules'], status: 'Idle', statusTone: 'neutral' },
}

export const AcrossBrands: Story = { render: (args) => <BrandGrid width="660px"><AgentHeader {...args} /></BrandGrid> }
