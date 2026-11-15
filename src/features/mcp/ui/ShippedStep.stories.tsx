import type { Meta, StoryObj } from '@storybook/preact-vite'
import { figma } from './ShippedStep.figma'
import { ScreenFixture } from './ScreenFixture'
import { SAMPLE_PULL, SAMPLE_TARGETS } from '../fixtures'
import { copiedAt, trackPhase, trackResult } from '../state'

const meta = { title: 'Screens/MCP handoff/5 Track · Pull request', parameters: { figma: { setId: figma.setId, name: figma.name } } } satisfies Meta
export default meta
type Story = StoryObj

const found = (state: 'open' | 'merged') => () => {
  copiedAt.value = '14:02'
  trackPhase.value = 'found'
  trackResult.value = { state, repo: SAMPLE_TARGETS.component.repo, branch: 'feat/ticket-row', ...SAMPLE_PULL }
}

/** Figma "MCP v3 · Component · 5 Track · Pull request open" (40002919:10426). */
export const PrLink: Story = {
  parameters: { figma: { variant: 'MCP handoff' } },
  render: () => <ScreenFixture at={3} setup={found('open')} />,
}

/** The same hand-off once the pull request is merged. */
export const Merged: Story = { render: () => <ScreenFixture at={3} setup={found('merged')} /> }
