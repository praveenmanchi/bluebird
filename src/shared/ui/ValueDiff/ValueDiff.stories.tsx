import type { Meta, StoryObj } from '@storybook/preact-vite'
import { ValueDiff } from './ValueDiff'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

/** The Publish tab paints these on its panel surface. */
const panel = { background: 'var(--bb-publish-surface-panel)', padding: 'var(--bb-publish-space-panel)' }

const meta = {
  title: 'Molecules/ValueDiff',
  component: ValueDiff,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  decorators: [(Story) => <div style={panel}><Story /></div>],
  argTypes: { kind: { control: 'inline-radio', options: ['color', 'number'] } },
  args: { kind: 'color' },
} satisfies Meta<typeof ValueDiff>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const Color: Story = { parameters: v('Kind=Color') }
export const NumberKind: Story = { args: { kind: 'number' }, parameters: v('Kind=Number') }
export const Spacing: Story = { args: { kind: 'number', old: '12px', new: '16px' } }

export const AcrossBrands: Story = {
  decorators: [],
  render: () => (
    <BrandGrid width="240px">
      <div style={{ ...panel, display: 'flex', flexDirection: 'column', gap: 'var(--bb-publish-space-section)' }}>
        <ValueDiff />
        <ValueDiff kind="number" old="12px" new="16px" />
      </div>
    </BrandGrid>
  ),
}
