import type { Meta, StoryObj } from '@storybook/preact-vite'
import { PrincipleTag, PRINCIPLES } from './PrincipleTag'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Atoms/PrincipleTag',
  component: PrincipleTag,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: { principle: { control: 'inline-radio', options: [...PRINCIPLES] } },
  args: { principle: 'perceivable' },
} satisfies Meta<typeof PrincipleTag>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const Perceivable: Story = { parameters: v('Principle=Perceivable') }
export const Operable: Story = { args: { principle: 'operable' }, parameters: v('Principle=Operable') }
export const Understandable: Story = { args: { principle: 'understandable' }, parameters: v('Principle=Understandable') }
export const Robust: Story = { args: { principle: 'robust' }, parameters: v('Principle=Robust') }

export const AllPrinciples: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--bb-space-inline-sm)' }}>
      {PRINCIPLES.map((p) => <PrincipleTag key={p} principle={p} />)}
    </div>
  ),
}

export const AcrossBrands: Story = {
  render: () => (
    <BrandGrid>
      {PRINCIPLES.map((p) => <PrincipleTag key={p} principle={p} />)}
    </BrandGrid>
  ),
}
