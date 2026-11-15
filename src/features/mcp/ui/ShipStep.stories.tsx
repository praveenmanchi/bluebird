import type { Meta, StoryObj } from '@storybook/preact-vite'
import { figma } from './ShipStep.figma'
import { ScreenFixture } from './ScreenFixture'
import { copiedAt, trackError, trackPhase } from '../state'

const meta = { title: 'Screens/MCP handoff/4 Track', parameters: { figma: { setId: figma.setId, name: figma.name } } } satisfies Meta
export default meta
type Story = StoryObj

/** Track right after the prompt was copied, before GitHub was asked. */
export const Track: Story = {
  parameters: { figma: { variant: 'MCP handoff' } },
  render: () => <ScreenFixture at={3} setup={() => { copiedAt.value = '14:02' }} />,
}

/** GitHub could not be asked (wrong token, no access, offline). */
export const TrackFailed: Story = {
  render: () => <ScreenFixture at={3} setup={() => { copiedAt.value = '14:02'; trackPhase.value = 'failed'; trackError.value = 'GitHub rejected the token for acme/design-system. Check it in Settings › MCP + code sync.' }} />,
}
