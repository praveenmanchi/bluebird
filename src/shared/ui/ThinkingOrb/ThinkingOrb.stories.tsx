import type { Meta, StoryObj } from '@storybook/preact-vite'
import { ThinkingOrb } from './ThinkingOrb'
import { figma } from './figma'
import { BrandGrid, VariantGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Atoms/ThinkingOrb',
  component: ThinkingOrb,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: {
    state: { control: 'inline-radio', options: ['searching', 'composing', 'breathing'] },
    size: { control: 'inline-radio', options: ['20', '40'] },
  },
  args: { state: 'searching', size: '20' },
} satisfies Meta<typeof ThinkingOrb>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const Searching20: Story = { parameters: v('State=Searching, Size=20') }
export const Searching40: Story = { args: { size: '40' }, parameters: v('State=Searching, Size=40') }
export const Composing20: Story = { args: { state: 'composing' }, parameters: v('State=Composing, Size=20') }
export const Composing40: Story = { args: { state: 'composing', size: '40' }, parameters: v('State=Composing, Size=40') }
export const Breathing20: Story = { args: { state: 'breathing' }, parameters: v('State=Breathing, Size=20') }
export const Breathing40: Story = { args: { state: 'breathing', size: '40' }, parameters: v('State=Breathing, Size=40') }

export const Matrix: Story = {
  render: () => (
    <VariantGrid rows={['searching', 'composing', 'breathing']} columns={['20', '40']}>
      {(state, size) => <ThinkingOrb state={state as 'searching'} size={size as '20'} />}
    </VariantGrid>
  ),
}

export const AcrossBrands: Story = {
  render: () => (
    <BrandGrid>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--bb-uxai-space-inline)' }}>
        <ThinkingOrb state="searching" size="40" />
        <ThinkingOrb state="composing" size="40" />
        <ThinkingOrb state="breathing" size="40" />
      </div>
    </BrandGrid>
  ),
}
