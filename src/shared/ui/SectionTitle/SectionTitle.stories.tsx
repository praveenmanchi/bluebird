import type { Meta, StoryObj } from '@storybook/preact-vite'
import { SectionTitle } from './SectionTitle'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/SectionTitle',
  component: SectionTitle,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: { onAction: { action: 'action' } },
  args: { title: 'Figma links', showCount: true, count: '2', showAction: true, actionLabel: 'Attach link' },
} satisfies Meta<typeof SectionTitle>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'Section Title' } } }
export const TitleOnly: Story = { args: { title: 'Comments', showCount: false, showAction: false } }

export const AcrossBrands: Story = {
  render: () => (
    <BrandGrid width="360px">
      <SectionTitle />
      <SectionTitle title="Comments" count="4" showAction={false} />
    </BrandGrid>
  ),
}
