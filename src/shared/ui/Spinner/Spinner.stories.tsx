import type { Meta, StoryObj } from '@storybook/preact-vite'
import { Spinner } from './Spinner'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Atoms/Spinner',
  component: Spinner,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
} satisfies Meta<typeof Spinner>
export default meta
type Story = StoryObj<typeof meta>

export const OnAccent: Story = { args: { tone: 'on-accent' }, parameters: { figma: { variant: 'Tone=On accent' } } }
export const Accent: Story = { args: { tone: 'accent' }, parameters: { figma: { variant: 'Tone=Accent' } } }
export const Large: Story = { args: { tone: 'accent', size: 'lg', label: 'Waiting for Microsoft' } }

export const AcrossBrands: Story = {
  render: () => (
    <BrandGrid width="200px">
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <Spinner />
        <Spinner tone="accent" />
        <Spinner tone="accent" size="lg" />
      </div>
    </BrandGrid>
  ),
}
