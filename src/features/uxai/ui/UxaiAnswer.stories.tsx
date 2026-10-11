import type { Meta, StoryObj } from '@storybook/preact-vite'
import { UxaiAnswer } from './UxaiAnswer'
import { figma } from './UxaiAnswer.figma'
import { SCREEN_THREADS, SOURCES } from '../fixtures'
import { Frame } from './stories.helpers'

const meta = { title: 'Screens/UXAI/Answer', parameters: { figma: { setId: figma.setId, name: figma.name } } } satisfies Meta
export default meta
type Story = StoryObj

/** Figma "UX AI · Answer" — body "UX AI body". */
export const Answer: Story = {
  parameters: { figma: { variant: 'UX AI body' } },
  render: () => <Frame><UxaiAnswer turns={SCREEN_THREADS.answer} sources={SOURCES} draft="" /></Frame>,
}

/** The S window (360 × 480): chips wrap, the thread scrolls. */
export const Small: Story = {
  render: () => <Frame width="360px" height="480px"><UxaiAnswer turns={SCREEN_THREADS.answer} sources={SOURCES} draft="" /></Frame>,
}
