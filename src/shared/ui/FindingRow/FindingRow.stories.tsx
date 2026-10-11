import type { Meta, StoryObj } from '@storybook/preact-vite'
import { FindingRow } from './FindingRow'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/FindingRow',
  component: FindingRow,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: { severity: { control: 'inline-radio', options: ['critical', 'serious', 'moderate', 'minor'] } },
  args: { severity: 'critical', onAction: () => undefined },
} satisfies Meta<typeof FindingRow>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const Critical: Story = { parameters: v('Severity=Critical') }
export const Serious: Story = { args: { severity: 'serious' }, parameters: v('Severity=Serious') }
export const Moderate: Story = { args: { severity: 'moderate' }, parameters: v('Severity=Moderate') }
export const Minor: Story = { args: { severity: 'minor' }, parameters: v('Severity=Minor') }
export const Selectable: Story = { args: { onSelect: () => undefined } }

export const AcrossBrands: Story = {
  render: (args) => (
    <BrandGrid width="660px">
      <FindingRow {...args} severity="critical" />
      <FindingRow {...args} severity="minor" />
    </BrandGrid>
  ),
}
