import type { Meta, StoryObj } from '@storybook/preact-vite'
import { figma } from './ShipPushing.figma'
import { ScreenFixture } from './ScreenFixture'
import { copiedAt, trackPhase } from '../state'

const meta = { title: 'Screens/MCP handoff/4 Track · Waiting', parameters: { figma: { setId: figma.setId, name: figma.name } } } satisfies Meta
export default meta
type Story = StoryObj

/** Figma "MCP v3 · Component · 4 Track · Waiting" (40002919:10193): the prompt is out, no pull request yet. */
export const Waiting: Story = {
  parameters: { figma: { variant: 'MCP handoff' } },
  render: () => <ScreenFixture at={3} setup={() => { copiedAt.value = '14:02'; trackPhase.value = 'waiting' }} />,
}
