import type { Meta, StoryObj } from '@storybook/preact-vite'
import { BotScene, BOT_SCENES } from './BotScene'
import { figma } from './figma'

const meta = {
  title: 'Atoms/BotScene',
  component: BotScene,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: { scene: { control: 'select', options: [...BOT_SCENES] } },
  args: { scene: 'no-connection', character: 'uxai' },
} satisfies Meta<typeof BotScene>
export default meta
type Story = StoryObj<typeof meta>

// One story per Figma variant. Figma's Agent variants show a sample agent; the stories use Content.
const v = (variant: string) => ({ figma: { variant } })
export const NoConnection: Story = { args: { scene: 'no-connection' }, parameters: v('Scene=No connection, Character=UX AI') }
export const DefaultNeeded: Story = { args: { scene: 'default-needed' }, parameters: v('Scene=Default needed, Character=UX AI') }
export const WireCut: Story = { args: { scene: 'wire-cut' }, parameters: v('Scene=Wire cut, Character=UX AI') }
export const ConnectionLost: Story = { args: { scene: 'connection-lost' }, parameters: v('Scene=Connection lost, Character=UX AI') }
export const WrongKey: Story = { args: { scene: 'wrong-key' }, parameters: v('Scene=Wrong key, Character=UX AI') }
export const TooManyRequests: Story = { args: { scene: 'too-many-requests' }, parameters: v('Scene=Too many requests, Character=UX AI') }
export const TimedOut: Story = { args: { scene: 'timed-out' }, parameters: v('Scene=Timed out, Character=UX AI') }
export const SomethingBroke: Story = { args: { scene: 'something-broke' }, parameters: v('Scene=Something broke, Character=UX AI') }
export const EmptyShelf: Story = { args: { scene: 'empty-shelf' }, parameters: v('Scene=Empty shelf, Character=UX AI') }
export const Unreadable: Story = { args: { scene: 'unreadable' }, parameters: v('Scene=Unreadable, Character=UX AI') }
export const NoAnswer: Story = { args: { scene: 'no-answer' }, parameters: v('Scene=No answer, Character=UX AI') }
export const NothingSelected: Story = { args: { scene: 'nothing-selected' }, parameters: v('Scene=Nothing selected, Character=UX AI') }
export const NoConnectionAgent: Story = { args: { scene: 'no-connection', character: 'content' }, parameters: v('Scene=No connection, Character=Agent') }
export const DefaultNeededAgent: Story = { args: { scene: 'default-needed', character: 'content' }, parameters: v('Scene=Default needed, Character=Agent') }
export const WireCutAgent: Story = { args: { scene: 'wire-cut', character: 'content' }, parameters: v('Scene=Wire cut, Character=Agent') }
export const ConnectionLostAgent: Story = { args: { scene: 'connection-lost', character: 'content' }, parameters: v('Scene=Connection lost, Character=Agent') }
export const WrongKeyAgent: Story = { args: { scene: 'wrong-key', character: 'content' }, parameters: v('Scene=Wrong key, Character=Agent') }
export const TooManyRequestsAgent: Story = { args: { scene: 'too-many-requests', character: 'content' }, parameters: v('Scene=Too many requests, Character=Agent') }
export const TimedOutAgent: Story = { args: { scene: 'timed-out', character: 'content' }, parameters: v('Scene=Timed out, Character=Agent') }
export const SomethingBrokeAgent: Story = { args: { scene: 'something-broke', character: 'content' }, parameters: v('Scene=Something broke, Character=Agent') }
export const NothingSelectedAgent: Story = { args: { scene: 'nothing-selected', character: 'content' }, parameters: v('Scene=Nothing selected, Character=Agent') }
export const AllClearAgent: Story = { args: { scene: 'all-clear', character: 'content' }, parameters: v('Scene=All clear, Character=Agent') }
export const FixStuckAgent: Story = { args: { scene: 'fix-stuck', character: 'content' }, parameters: v('Scene=Fix stuck, Character=Agent') }

export const AllScenes: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--bb-uxai-space-section)' }}>
      {BOT_SCENES.map((scene) => <BotScene key={scene} scene={scene} />)}
    </div>
  ),
}
