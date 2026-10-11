import type { Meta, StoryObj } from '@storybook/preact-vite'
import { PriorityIcon } from './PriorityIcon'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Atoms/PriorityIcon',
  component: PriorityIcon,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: { priority: { control: 'inline-radio', options: ['highest', 'high', 'medium', 'low', 'lowest'] } },
  args: { priority: 'highest' },
} satisfies Meta<typeof PriorityIcon>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const Highest: Story = { parameters: v('Priority=Highest') }
export const High: Story = { args: { priority: 'high' }, parameters: v('Priority=High') }
export const Medium: Story = { args: { priority: 'medium' }, parameters: v('Priority=Medium') }
export const Low: Story = { args: { priority: 'low' }, parameters: v('Priority=Low') }
export const Lowest: Story = { args: { priority: 'lowest' }, parameters: v('Priority=Lowest') }

export const AcrossBrands: Story = {
  render: () => (
    <BrandGrid>
      <div style={{ display: 'flex', gap: 'var(--bb-jira-space-inline)' }}>
        <PriorityIcon priority="highest" />
        <PriorityIcon priority="high" />
        <PriorityIcon priority="medium" />
        <PriorityIcon priority="low" />
        <PriorityIcon priority="lowest" />
      </div>
    </BrandGrid>
  ),
}
