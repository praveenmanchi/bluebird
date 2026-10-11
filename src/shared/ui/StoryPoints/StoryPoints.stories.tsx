import type { Meta, StoryObj } from '@storybook/preact-vite'
import { StoryPoints } from './StoryPoints'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Atoms/StoryPoints',
  component: StoryPoints,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { children: '5' },
} satisfies Meta<typeof StoryPoints>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'Story Points' } } }
export const TwoDigits: Story = { args: { children: '13' } }

export const AcrossBrands: Story = {
  render: () => (
    <BrandGrid>
      <div style={{ display: 'flex', gap: 'var(--bb-jira-space-inline)' }}>
        <StoryPoints>1</StoryPoints>
        <StoryPoints>5</StoryPoints>
        <StoryPoints>13</StoryPoints>
      </div>
    </BrandGrid>
  ),
}
