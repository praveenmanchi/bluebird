import type { Meta, StoryObj } from '@storybook/preact-vite'
import { UxaiComponent } from './UxaiComponent'
import { figma } from './UxaiComponent.figma'
import { SCREEN_THREADS, SOURCES } from '../fixtures'
import { Frame } from './stories.helpers'

const meta = { title: 'Screens/UXAI/Component', parameters: { figma: { setId: figma.setId, name: figma.name } } } satisfies Meta
export default meta
type Story = StoryObj

/** Figma "UX AI · Component" — body "UX AI body". */
export const Component: Story = {
  parameters: { figma: { variant: 'UX AI body' } },
  render: () => <Frame><UxaiComponent turns={SCREEN_THREADS.component} sources={SOURCES} draft="" /></Frame>,
}

/** The S window (360 × 480): chips wrap, the thread scrolls. */
export const Small: Story = {
  render: () => <Frame width="360px" height="480px"><UxaiComponent turns={SCREEN_THREADS.component} sources={SOURCES} draft="" /></Frame>,
}
