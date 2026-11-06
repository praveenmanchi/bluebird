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

export const NoConnection: Story = {}
export const Agent: Story = { args: { scene: 'all-clear', character: 'content' } }

export const AllScenes: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--bb-uxai-space-section)' }}>
      {BOT_SCENES.map((scene) => <BotScene key={scene} scene={scene} />)}
    </div>
  ),
}
