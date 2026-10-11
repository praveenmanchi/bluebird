import type { Meta, StoryObj } from '@storybook/preact-vite'
import { figma } from './GenerateStep.figma'
import { ScreenFixture } from './ScreenFixture'
import { generation } from '../state'

const meta = { title: 'Screens/MCP handoff/3 Generate', parameters: { figma: { setId: figma.setId, name: figma.name } } } satisfies Meta
export default meta
type Story = StoryObj

/** Figma "MCP v2 · 3 Generate" (40000496:7346). */
export const Generate: Story = {
  parameters: { figma: { variant: 'MCP handoff' } },
  render: () => <ScreenFixture at={2} />,
}

/** Figma "MCP v2 · Error · Generation failed" (40000497:8887). */
export const GenerationFailed: Story = { render: () => <ScreenFixture at={2} setup={() => { generation.value = 'failed' }} /> }
