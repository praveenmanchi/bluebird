import type { Meta, StoryObj } from '@storybook/preact-vite'
import { BrandSwatch } from './BrandSwatch'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/BrandSwatch',
  component: BrandSwatch,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { hex: '#0A84FF' },
} satisfies Meta<typeof BrandSwatch>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'Brand Swatch' } } }
export const BrandMode: Story = { args: { brand: 'fiskars', hex: '#FF8E00', color: 'var(--bb-surface-accent)' } }

export const AcrossBrands: Story = {
  render: () => (
    <BrandGrid width="120px">
      <BrandSwatch color="var(--bb-surface-accent)" hex="surface/accent" label="Ambient brand" />
    </BrandGrid>
  ),
}
