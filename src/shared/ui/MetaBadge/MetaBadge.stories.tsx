import type { Meta, StoryObj } from '@storybook/preact-vite'
import { MetaBadge } from './MetaBadge'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Atoms/MetaBadge',
  component: MetaBadge,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: { tone: { control: 'inline-radio', options: ['neutral', 'accent', 'success', 'warning', 'danger'] } },
  args: { tone: 'neutral', children: 'Label' },
} satisfies Meta<typeof MetaBadge>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const Neutral: Story = { parameters: v('Tone=Neutral') }
export const Accent: Story = { args: { tone: 'accent', children: 'New' }, parameters: v('Tone=Accent') }
export const Success: Story = { args: { tone: 'success', children: 'Fixed' }, parameters: v('Tone=Success') }
export const Warning: Story = { args: { tone: 'warning', children: 'Moderate' }, parameters: v('Tone=Warning') }
export const Danger: Story = { args: { tone: 'danger', children: 'Critical' }, parameters: v('Tone=Danger') }
export const WithMeta: Story = { args: { tone: 'accent', children: 'Regressed', meta: 'passed on 21 Sep' } }

export const AcrossBrands: Story = {
  render: () => (
    <BrandGrid>
      <div style={{ display: 'flex', gap: 'var(--bb-space-inline-sm)', flexWrap: 'wrap' }}>
        <MetaBadge tone="danger">Critical</MetaBadge>
        <MetaBadge tone="warning">Moderate</MetaBadge>
        <MetaBadge tone="success">Fixed</MetaBadge>
      </div>
    </BrandGrid>
  ),
}
