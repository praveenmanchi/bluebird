import type { Meta, StoryObj } from '@storybook/preact-vite'
import { KpiTile } from './KpiTile'
import { figma } from './figma'

const meta = {
  title: 'Molecules/KpiTile',
  component: KpiTile,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { label: 'Passing', value: '26', caption: '68% of components', icon: 'status-good' },
  decorators: [(Story) => <div style={{ width: '130px' }}><Story /></div>],
} satisfies Meta<typeof KpiTile>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const Neutral: Story = { args: { tone: 'neutral', label: 'Components', value: '38', caption: 'across 3 levels', icon: 'component' }, parameters: v('Tone=Neutral') }
export const Success: Story = { args: { tone: 'success' }, parameters: v('Tone=Success') }
export const Warning: Story = { args: { tone: 'warning', label: 'Frames', value: '0 / 1', caption: 'Login screen fails AA', icon: 'layers' }, parameters: v('Tone=Warning') }
export const Danger: Story = { args: { tone: 'danger', label: 'Failing', value: '12', caption: '32% · 23 findings', icon: 'status-error' }, parameters: v('Tone=Danger') }
export const Empty: Story = { args: { tone: 'empty', value: '—', caption: 'waiting for scan' }, parameters: v('Tone=Empty') }
