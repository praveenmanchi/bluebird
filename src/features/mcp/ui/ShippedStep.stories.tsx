import type { Meta, StoryObj } from '@storybook/preact-vite'
import { figma } from './ShippedStep.figma'
import { ScreenFixture } from './ScreenFixture'
import { shipPhase, shipProgress, steps } from '../state'

const meta = { title: 'Screens/MCP handoff/6 PR link', parameters: { figma: { setId: figma.setId, name: figma.name } } } satisfies Meta
export default meta
type Story = StoryObj

/** Figma "MCP v2 · 6 Ship · PR link" (40000496:8528). */
export const PrLink: Story = {
  parameters: { figma: { variant: 'MCP handoff' } },
  render: () => <ScreenFixture at={3} setup={() => { shipPhase.value = 'pushed'; shipProgress.value = steps.value.length }} />,
}
