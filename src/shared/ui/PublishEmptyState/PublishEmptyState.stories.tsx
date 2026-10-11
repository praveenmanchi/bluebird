import type { Meta, StoryObj } from '@storybook/preact-vite'
import { PublishEmptyState } from './PublishEmptyState'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

/** The Publish tab paints these on its panel surface, at the Figma 400 width. */
const panel = { background: 'var(--bb-publish-surface-panel)', padding: 'var(--bb-publish-space-panel)' }

const meta = {
  title: 'Molecules/PublishEmptyState',
  component: PublishEmptyState,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  decorators: [(Story) => <div style={{ ...panel, width: 'var(--bb-derived-publish-empty-state-root-width)' }}><Story /></div>],
  argTypes: {
    state: { control: 'select', options: ['no-changes', 'not-connected', 'failed', 'first-release', 'empty-file', 'ready-to-extract'] },
  },
  args: { state: 'no-changes' },
} satisfies Meta<typeof PublishEmptyState>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const NoChanges: Story = { parameters: v('State=No changes') }
export const NotConnected: Story = { args: { state: 'not-connected' }, parameters: v('State=Not connected') }
export const Failed: Story = { args: { state: 'failed' }, parameters: v('State=Failed') }
export const FirstRelease: Story = { args: { state: 'first-release' }, parameters: v('State=First release') }
export const EmptyFile: Story = { args: { state: 'empty-file' }, parameters: v('State=Empty file') }
export const ReadyToExtract: Story = { args: { state: 'ready-to-extract' }, parameters: v('State=Ready to extract') }

export const AcrossBrands: Story = {
  decorators: [],
  render: () => (
    <BrandGrid width="400px">
      <div style={panel}><PublishEmptyState state="failed" /></div>
    </BrandGrid>
  ),
}
