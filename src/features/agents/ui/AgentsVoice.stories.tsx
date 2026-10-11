import type { Meta, StoryObj } from '@storybook/preact-vite'
import { AgentsVoice } from './AgentsVoice'
import { figma } from './AgentsVoice.figma'

const frame = { width: '760px', height: '760px', display: 'flex', flexDirection: 'column' as const, overflow: 'auto' }

const meta = { title: 'Screens/UX AI agents/Voice', parameters: { figma: { setId: figma.setId, name: figma.name } } } satisfies Meta
export default meta
type Story = StoryObj

/** Figma "Agents body" on "AI Agents · Voice", rendered with the screen's fixture copy. */
export const AgentsBody: Story = {
  parameters: { figma: { variant: 'Agents body' } },
  render: () => <div style={frame}><AgentsVoice /></div>,
}

/** The same screen in the smallest plugin window (S, 360 × 480). */
export const Small: Story = {
  render: () => <div style={{ ...frame, width: '360px', height: '480px' }}><AgentsVoice /></div>,
}
