import type { Meta, StoryObj } from '@storybook/preact-vite'
import { ColorSwatch } from './ColorSwatch'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Atoms/ColorSwatch',
  component: ColorSwatch,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: { size: { control: 'inline-radio', options: ['small', 'large'] } },
  args: { size: 'small' },
} satisfies Meta<typeof ColorSwatch>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const Small: Story = { parameters: v('Size=Small') }
export const Large: Story = { args: { size: 'large' }, parameters: v('Size=Large') }
export const CustomColor: Story = { args: { size: 'large', color: 'var(--bb-surface-accent)', label: 'surface/accent' } }

export const AcrossBrands: Story = {
  render: () => (
    <BrandGrid width="120px">
      <div style={{ display: 'flex', gap: 'var(--bb-uxai-space-inline)', alignItems: 'center' }}>
        <ColorSwatch />
        <ColorSwatch size="large" />
      </div>
    </BrandGrid>
  ),
}
