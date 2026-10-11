import type { Meta, StoryObj } from '@storybook/preact-vite'
import { ScoreRow } from './ScoreRow'
import { figma } from './figma'

const meta = {
  title: 'Molecules/ScoreRow',
  component: ScoreRow,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { value: 68, meterScore: '26 / 38', caption: '12 components fail at least one check' },
  decorators: [(Story) => <div style={{ width: '542px' }}><Story /></div>],
} satisfies Meta<typeof ScoreRow>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'Score Row' } } }
export const BeforeScan: Story = { args: { value: null, meterScore: '— / 38', caption: 'Run a scan to see which components pass' } }
