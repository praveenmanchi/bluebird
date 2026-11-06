import type { Meta, StoryObj } from '@storybook/preact-vite'
import { UxaiBot, UXAI_BOT_STATES } from './UxaiBot'
import { figma } from './figma'
import { BrandGrid, VariantGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Atoms/UxaiBot',
  component: UxaiBot,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: {
    state: { control: 'inline-radio', options: [...UXAI_BOT_STATES] },
    size: { control: 'inline-radio', options: ['20', '40'] },
  },
  args: { state: 'ready', size: '40' },
} satisfies Meta<typeof UxaiBot>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const Ready: Story = { args: { state: 'ready' }, parameters: v('State=Ready') }
export const Searching: Story = { args: { state: 'searching' }, parameters: v('State=Searching') }
export const Answering: Story = { args: { state: 'answering' }, parameters: v('State=Answering') }

export const Matrix: Story = {
  render: () => (
    <VariantGrid rows={['20', '40']} columns={[...UXAI_BOT_STATES]}>
      {(size, state) => <UxaiBot size={size as '20' | '40'} state={state as (typeof UXAI_BOT_STATES)[number]} />}
    </VariantGrid>
  ),
}

export const AcrossBrands: Story = {
  render: () => (
    <BrandGrid width='200px'>
      <div style={{ display: 'flex', gap: 'var(--bb-uxai-space-inline)' }}>
        {UXAI_BOT_STATES.map((state) => <UxaiBot key={state} state={state} />)}
      </div>
    </BrandGrid>
  ),
}
