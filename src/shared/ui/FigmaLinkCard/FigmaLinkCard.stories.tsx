import type { Meta, StoryObj } from '@storybook/preact-vite'
import { FigmaLinkCard } from './FigmaLinkCard'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/FigmaLinkCard',
  component: FigmaLinkCard,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: { onOpen: { action: 'open' }, onCopy: { action: 'copy' } },
  args: { frame: 'WCAG Card / Mode=colors', path: 'Plugin UI › Components' },
} satisfies Meta<typeof FigmaLinkCard>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'Figma Link Card' } } }
export const LongName: Story = { args: { frame: 'Ticket Row / State=Selected / Brand=Richemont / Density=Compact', path: 'Plugin UI › Jira › Ticket list › Overflow cases' } }

export const AcrossBrands: Story = {
  render: () => (
    <BrandGrid width="380px">
      <FigmaLinkCard />
    </BrandGrid>
  ),
}
