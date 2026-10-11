import type { Meta, StoryObj } from '@storybook/preact-vite'
import { JiraEmptyState } from './JiraEmptyState'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/JiraEmptyState',
  component: JiraEmptyState,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: {
    state: { control: 'inline-radio', options: ['no-tickets', 'not-connected', 'error'] },
    onAction: { action: 'action' },
  },
  args: { state: 'no-tickets' },
} satisfies Meta<typeof JiraEmptyState>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const NoTickets: Story = { parameters: v('State=No tickets') }
export const NotConnected: Story = { args: { state: 'not-connected' }, parameters: v('State=Not connected') }
export const ErrorState: Story = { name: 'Error', args: { state: 'error' }, parameters: v('State=Error') }

export const AcrossBrands: Story = {
  render: () => (
    <BrandGrid width="380px">
      <JiraEmptyState state="not-connected" />
    </BrandGrid>
  ),
}
