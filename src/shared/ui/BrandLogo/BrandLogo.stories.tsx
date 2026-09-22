import type { Meta, StoryObj } from '@storybook/preact-vite'
import { BrandLogo } from './BrandLogo'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Atoms/BrandLogo',
  component: BrandLogo,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: { brand: { control: 'select', options: [undefined, 'bridge', 'ikea', 'richemont', 'disney', 'fiskars'] } },
} satisfies Meta<typeof BrandLogo>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
/** Follows the toolbar brand, exactly like the Figma variable binding. */
export const FollowsBrand: Story = {}
export const Bridge: Story = { args: { brand: 'bridge' }, parameters: v('Brand=bridge') }
export const Ikea: Story = { args: { brand: 'ikea' }, parameters: v('Brand=ikea') }
export const Richemont: Story = { args: { brand: 'richemont' }, parameters: v('Brand=richemont') }
export const Disney: Story = { args: { brand: 'disney' }, parameters: v('Brand=disney') }
export const Fiskars: Story = { args: { brand: 'fiskars' }, parameters: v('Brand=fiskars') }
export const Hcl: Story = { args: { logo: 'hcltech' }, parameters: v('Brand=HCL') }

export const AcrossBrands: Story = {
  render: () => (
    <BrandGrid width="200px">
      <div style={{ background: 'var(--bb-banner-bg)', padding: 'var(--bb-space-inset-sm)', borderRadius: 'var(--bb-radius-sm)' }}><BrandLogo /></div>
    </BrandGrid>
  ),
}
