import type { Meta, StoryObj } from '@storybook/preact-vite'
import { figma } from './McpHandoff.figma'
import { ScreenFixture } from './ScreenFixture'
import { noTarget } from '../fixtures'
import { clearSelection, mcpConnected, setKind, targets } from '../state'

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

/** Figma "MCP v3 · Screen · 1 Select" (40002920:10416). */
export const Screen: Story = { render: () => <ScreenFixture id="screen" /> }

/** Figma "MCP v3 · Library update · Empty · Repository not connected" (40002927:12068). */
export const RepositoryNotConnected: Story = {
  render: () => <ScreenFixture setup={() => { targets.value = { ...targets.value, library: noTarget('library') }; setKind('library') }} />,
}

/** The library scenario with its repository connected: the comparison isn't built yet. */
export const LibraryUpdate: Story = { render: () => <ScreenFixture setup={() => setKind('library')} /> }
