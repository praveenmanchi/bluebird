import type { Meta, StoryObj } from '@storybook/preact-vite'
import { VoiceWave } from './VoiceWave'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Atoms/VoiceWave',
  component: VoiceWave,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: { state: { control: 'inline-radio', options: ['idle', 'listening', 'speaking'] } },
  args: { state: 'idle' },
} satisfies Meta<typeof VoiceWave>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const Idle: Story = { parameters: v('State=Idle') }
export const Listening: Story = { args: { state: 'listening' }, parameters: v('State=Listening') }
export const Speaking: Story = { args: { state: 'speaking' }, parameters: v('State=Speaking') }
export const LiveLevels: Story = { args: { state: 'listening', levels: [0.2, 0.5, 0.8, 0.4, 1, 0.6, 0.3, 0.7, 0.35] } }

export const AcrossBrands: Story = {
  render: () => (
    <BrandGrid width="120px">
      <VoiceWave state="idle" />
      <VoiceWave state="listening" />
      <VoiceWave state="speaking" />
    </BrandGrid>
  ),
}
