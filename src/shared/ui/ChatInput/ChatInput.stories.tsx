import type { Meta, StoryObj } from '@storybook/preact-vite'
import { useState } from 'preact/hooks'
import { ChatInput, type ChatInputState } from './ChatInput'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Organisms/ChatInput',
  component: ChatInput,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: { state: { control: 'inline-radio', options: ['idle', 'active', 'generating'] } },
  args: { state: 'idle', showContext: true, onSend: () => undefined, onStop: () => undefined },
} satisfies Meta<typeof ChatInput>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const Idle: Story = { parameters: v('State=Idle') }
export const Active: Story = { args: { state: 'active' }, parameters: v('State=Active') }
export const Generating: Story = {
  args: { state: 'generating', defaultValue: 'What variables are used in this component?' },
  parameters: v('State=Generating'),
}
export const WithoutContext: Story = { args: { showContext: false } }

export const Conversation: Story = {
  render: () => {
    const [state, setState] = useState<ChatInputState>('idle')
    const [sent, setSent] = useState<readonly string[]>([])
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bb-uxai-space-section)' }}>
        {sent.map((s, i) => <span key={i} style={{ color: 'var(--bb-uxai-text-body)' }}>{s}</span>)}
        <ChatInput
          state={state}
          onSend={(text) => { setSent([...sent, text]); setState('generating') }}
          onStop={() => setState('idle')}
        />
      </div>
    )
  },
}

export const AcrossBrands: Story = {
  render: () => (
    <BrandGrid width="420px">
      <ChatInput state="idle" />
      <ChatInput state="generating" defaultValue="What variables are used in this component?" />
    </BrandGrid>
  ),
}
