import type { Meta, StoryObj } from '@storybook/preact-vite'
import { Rating } from './Rating'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Atoms/Rating',
  component: Rating,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: { rating: { control: 'inline-radio', options: ['A', 'AA', 'AAA'] } },
  args: { rating: 'A' },
} satisfies Meta<typeof Rating>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const A: Story = { parameters: v('Rating=A') }
export const AA: Story = { args: { rating: 'AA' }, parameters: v('Rating=AA') }
export const AAA: Story = { args: { rating: 'AAA' }, parameters: v('Rating=AAA') }

export const AcrossBrands: Story = {
  render: () => (
    <BrandGrid>
      <div style={{ display: 'flex', gap: 'var(--bb-space-inline-sm)' }}>
        <Rating rating="A" />
        <Rating rating="AA" />
        <Rating rating="AAA" />
      </div>
    </BrandGrid>
  ),
}
