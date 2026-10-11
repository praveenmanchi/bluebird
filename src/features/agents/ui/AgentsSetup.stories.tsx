import type { Meta, StoryObj } from '@storybook/preact-vite'
import { AgentsSetup } from './AgentsSetup'
import { figma } from './AgentsSetup.figma'

const frame = { width: '760px', height: '760px', display: 'flex', flexDirection: 'column' as const, overflow: 'auto' }

const meta = { title: 'Screens/UX AI agents/Setup', parameters: { figma: { setId: figma.setId, name: figma.name } } } satisfies Meta
export default meta
type Story = StoryObj

/** Figma "Agents body" on "AI Agents · Setup", rendered with the screen's fixture copy. */
export const AgentsBody: Story = {
  parameters: { figma: { variant: 'Agents body' } },
  render: () => <div style={frame}><AgentsSetup /></div>,
}

/** The same screen in the smallest plugin window (S, 360 × 480). */
export const Small: Story = {
  render: () => <div style={{ ...frame, width: '360px', height: '480px' }}><AgentsSetup /></div>,
}
