import type { Meta, StoryObj } from '@storybook/preact-vite'
import { RuleRow } from './RuleRow'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/RuleRow',
  component: RuleRow,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: { level: { control: 'inline-radio', options: ['A', 'AA', 'AAA'] } },
  args: { onToggle: () => undefined },
} satisfies Meta<typeof RuleRow>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'Rule Row' } } }
export const Disabled: Story = { args: { enabled: false, name: '2.5.8 Target size (minimum)', description: 'Targets at least 24 × 24 CSS pixels', level: 'AA' } }
export const LevelAAA: Story = { args: { name: '1.4.6 Contrast (enhanced)', description: 'Text 7:1, large text 4.5:1', level: 'AAA' } }

export const AcrossBrands: Story = {
  render: (args) => (
    <BrandGrid width="420px">
      <RuleRow {...args} />
      <RuleRow {...args} enabled={false} level="A" name="1.4.1 Use of colour" description="Colour is never the only cue" />
    </BrandGrid>
  ),
}
