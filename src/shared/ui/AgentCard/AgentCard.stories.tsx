import type { Meta, StoryObj } from '@storybook/preact-vite'
import { AgentCard } from './AgentCard'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Organisms/AgentCard',
  component: AgentCard,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: { state: { control: 'inline-radio', options: ['ready', 'running', 'idle', 'coming-soon'] } },
  args: { state: 'ready', onRun: () => undefined, onStop: () => undefined },
} satisfies Meta<typeof AgentCard>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const Ready: Story = { parameters: v('State=Ready') }
export const Running: Story = { args: { state: 'running' }, parameters: v('State=Running') }
export const Idle: Story = { args: { state: 'idle' }, parameters: v('State=Idle') }
export const ComingSoon: Story = { args: { state: 'coming-soon' }, parameters: v('State=Coming soon') }
export const Localization: Story = {
  args: { state: 'idle', agent: 'localization', name: 'Localization', purpose: 'Finds truncation, hard-coded strings and RTL issues across locales.', rules: 'ICU · 14 locales' },
}

export const AcrossBrands: Story = {
  render: (args) => (
    <BrandGrid width="280px">
      <AgentCard {...args} state="ready" />
      <AgentCard {...args} state="running" />
    </BrandGrid>
  ),
}
