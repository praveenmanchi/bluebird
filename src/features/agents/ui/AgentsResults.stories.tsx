import type { Meta, StoryObj } from '@storybook/preact-vite'
import { AgentsResults } from './AgentsResults'
import { figma } from './AgentsResults.figma'

const frame = { width: '760px', height: '760px', display: 'flex', flexDirection: 'column' as const, overflow: 'auto' }

const meta = { title: 'Screens/UX AI agents/Results', parameters: { figma: { setId: figma.setId, name: figma.name } } } satisfies Meta
export default meta
type Story = StoryObj

/** Figma "Agents body" on "AI Agents · Results", rendered with the screen's fixture copy. */
export const AgentsBody: Story = {
  parameters: { figma: { variant: 'Agents body' } },
  render: () => <div style={frame}><AgentsResults /></div>,
}

/** The same screen in the smallest plugin window (S, 360 × 480). */
export const Small: Story = {
  render: () => <div style={{ ...frame, width: '360px', height: '480px' }}><AgentsResults /></div>,
}
