import type { Meta, StoryObj } from '@storybook/preact-vite'
import { figma } from './ShipStep.figma'
import { ScreenFixture } from './ScreenFixture'
import { NO_GITHUB } from '../fixtures'
import { github, rejectNextPush, shipPhase, shipProgress } from '../state'

const meta = { title: 'Screens/MCP handoff/4 Ship', parameters: { figma: { setId: figma.setId, name: figma.name } } } satisfies Meta
export default meta
type Story = StoryObj

/** Figma "MCP v2 · 4 Ship" (40000496:7650). */
export const Ship: Story = {
  parameters: { figma: { variant: 'MCP handoff' } },
  render: () => <ScreenFixture at={3} />,
}

/** Figma "MCP v2 · Empty · GitHub not connected" (40000497:8416). */
export const GithubNotConnected: Story = { render: () => <ScreenFixture at={3} setup={() => { github.value = NO_GITHUB }} /> }

/** Figma "MCP v2 · Error · Push rejected" (40000497:9109). */
export const PushRejected: Story = {
  render: () => <ScreenFixture at={3} setup={() => { rejectNextPush.value = true; shipPhase.value = 'rejected'; shipProgress.value = 1 }} />,
}
