import type { Meta, StoryObj } from '@storybook/preact-vite'
import { figma } from './GenerateStep.figma'
import { ScreenFixture } from './ScreenFixture'
import { mode, view } from '../state'

const meta = { title: 'Screens/MCP handoff/3 Hand off', parameters: { figma: { setId: figma.setId, name: figma.name } } } satisfies Meta
export default meta
type Story = StoryObj

/** Figma "MCP v3 · Component · 3 Hand off" (40002919:9997). */
export const HandOff: Story = {
  parameters: { figma: { variant: 'MCP handoff' } },
  render: () => <ScreenFixture at={2} />,
}

/** Figma "MCP v3 · Component update · 3 Hand off" (40002924:12058). */
export const UpdateExisting: Story = { render: () => <ScreenFixture at={2} setup={() => { mode.value = 'update' }} /> }

/** Figma "MCP v3 · Screen · 3 Hand off" (40002920:10959). */
export const Screen: Story = { render: () => <ScreenFixture id="screen" at={2} /> }

/** The MCP setup view of the snippet. */
export const McpSetup: Story = { render: () => <ScreenFixture at={2} setup={() => { view.value = 'setup' }} /> }
