import type { Meta, StoryObj } from '@storybook/preact-vite'
import { figma } from './CheckStep.figma'
import { ScreenFixture } from './ScreenFixture'

const meta = { title: 'Screens/MCP handoff/2 Check', parameters: { figma: { setId: figma.setId, name: figma.name } } } satisfies Meta
export default meta
type Story = StoryObj

/** Figma "MCP v2 · 2 Check" (40000496:7034). */
export const Check: Story = {
  parameters: { figma: { variant: 'MCP handoff' } },
  render: () => <ScreenFixture at={1} />,
}

/** Figma "MCP v2 · Error · Not ready" (40000497:8631): two failing checks lock Generate. */
export const NotReady: Story = { render: () => <ScreenFixture id="not-ready" at={1} /> }
