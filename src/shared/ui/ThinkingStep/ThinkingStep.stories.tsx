import type { Meta, StoryObj } from '@storybook/preact-vite'
import { ThinkingStep } from './ThinkingStep'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Atoms/ThinkingStep',
  component: ThinkingStep,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: { status: { control: 'inline-radio', options: ['done', 'running'] } },
  args: { status: 'done', children: 'Searched Variables · Brand UI (421)' },
} satisfies Meta<typeof ThinkingStep>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const Done: Story = { parameters: v('Status=Done') }
export const Running: Story = { args: { status: 'running' }, parameters: v('Status=Running') }

export const AcrossBrands: Story = {
  render: () => (
    <BrandGrid width="240px">
      <ThinkingStep status="done">Searched Variables · Brand UI (421)</ThinkingStep>
      <ThinkingStep status="running">Reading Ticket Row bindings</ThinkingStep>
    </BrandGrid>
  ),
}
