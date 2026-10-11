import type { Meta, StoryObj } from '@storybook/preact-vite'
import { VoiceBar } from './VoiceBar'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/VoiceBar',
  component: VoiceBar,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: { state: { control: 'inline-radio', options: ['idle', 'listening', 'speaking'] } },
  args: { state: 'idle', onToggle: () => undefined },
} satisfies Meta<typeof VoiceBar>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const Idle: Story = { parameters: v('State=Idle') }
export const Listening: Story = { args: { state: 'listening' }, parameters: v('State=Listening') }
export const Speaking: Story = { args: { state: 'speaking' }, parameters: v('State=Speaking') }

export const AcrossBrands: Story = {
  render: (args) => (
    <BrandGrid width="660px">
      <VoiceBar {...args} state="idle" />
      <VoiceBar {...args} state="listening" />
      <VoiceBar {...args} state="speaking" />
    </BrandGrid>
  ),
}
