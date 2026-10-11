import type { Meta, StoryObj } from '@storybook/preact-vite'
import { figma } from './McpHandoff.figma'
import { ScreenFixture } from './ScreenFixture'
import { clearSelection, mcpConnected } from '../state'

const meta = { title: 'Screens/MCP handoff/1 Select', parameters: { figma: { setId: figma.setId, name: figma.name } } } satisfies Meta
export default meta
type Story = StoryObj

/** Figma "MCP v2 · 1 Select" (40000496:6691). */
export const Select: Story = {
  parameters: { figma: { variant: 'MCP handoff' } },
  render: () => <ScreenFixture />,
}

/** Figma "MCP v2 · Empty · MCP server not connected" (40000497:7750). */
export const McpNotConnected: Story = { render: () => <ScreenFixture setup={() => { mcpConnected.value = false }} /> }

/** Figma "MCP v2 · Empty · Nothing selected" (40000497:7973). */
export const NothingSelected: Story = { render: () => <ScreenFixture setup={clearSelection} /> }

/** Figma "MCP v2 · Empty · No Jira issue" (40000497:8199). */
export const NoJiraIssue: Story = { render: () => <ScreenFixture id="no-issue" /> }
