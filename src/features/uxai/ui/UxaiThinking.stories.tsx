import type { Meta, StoryObj } from '@storybook/preact-vite'
import { UxaiThinking } from './UxaiThinking'
import { figma } from './UxaiThinking.figma'
import { SCREEN_THREADS, SOURCES } from '../fixtures'
import { Frame } from './stories.helpers'

const meta = { title: 'Screens/UXAI/Thinking', parameters: { figma: { setId: figma.setId, name: figma.name } } } satisfies Meta
export default meta
type Story = StoryObj

/** Figma "UX AI · Thinking" — body "UX AI body". */
export const Thinking: Story = {
  parameters: { figma: { variant: 'UX AI body' } },
  render: () => <Frame><UxaiThinking turns={SCREEN_THREADS.thinking} sources={SOURCES} draft="" /></Frame>,
}

/** The S window (360 × 480): chips wrap, the thread scrolls. */
export const Small: Story = {
  render: () => <Frame width="360px" height="480px"><UxaiThinking turns={SCREEN_THREADS.thinking} sources={SOURCES} draft="" /></Frame>,
}
