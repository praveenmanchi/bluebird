import type { Meta, StoryObj } from '@storybook/preact-vite'
import { Message } from './Message'
import { figma } from './figma'
import { ThinkingStep } from '../ThinkingStep/ThinkingStep'
import { ContextChip } from '../ContextChip/ContextChip'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/Message',
  component: Message,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: { role: { control: 'inline-radio', options: ['user', 'assistant'] } },
  args: { role: 'user', text: 'What is our primary colour?' },
} satisfies Meta<typeof Message>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const User: Story = { parameters: v('Role=User') }
export const Assistant: Story = { args: { role: 'assistant' }, parameters: v('Role=Assistant') }

export const AssistantWithContent: Story = {
  args: { role: 'assistant', orbState: 'composing', text: 'Your primary colour is Brand/Primary (#0C8CE9).' },
  render: (args) => (
    <Message {...args}>
      <ThinkingStep status="done">Searched Variables · Brand UI (421)</ThinkingStep>
      <ContextChip type="citation">Brand UI variables</ContextChip>
    </Message>
  ),
}

export const AcrossBrands: Story = {
  render: () => (
    <BrandGrid width="320px">
      <Message role="user" text="What is our primary colour?" />
      <Message role="assistant" text="Brand/Primary, bound in 42 components." />
    </BrandGrid>
  ),
}
