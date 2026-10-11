import type { Meta, StoryObj } from '@storybook/preact-vite'
import { figma } from './ShipPushing.figma'
import { ScreenFixture } from './ScreenFixture'
import { shipPhase, shipProgress } from '../state'

const meta = { title: 'Screens/MCP handoff/5 Pushing', parameters: { figma: { setId: figma.setId, name: figma.name } } } satisfies Meta
export default meta
type Story = StoryObj

/** Figma "MCP v2 · 5 Ship · Pushing" (40000496:7992): push branch done, PR opening. */
export const Pushing: Story = {
  parameters: { figma: { variant: 'MCP handoff' } },
  render: () => <ScreenFixture at={3} setup={() => { shipPhase.value = 'pushing'; shipProgress.value = 2 }} />,
}
