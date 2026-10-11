import type { Meta, StoryObj } from '@storybook/preact-vite'
import { BrandDiffRow } from './BrandDiffRow'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

/** The Publish tab paints these on its panel surface. */
const panel = { background: 'var(--bb-publish-surface-panel)', padding: 'var(--bb-publish-space-panel)' }

const meta = {
  title: 'Molecules/BrandDiffRow',
  component: BrandDiffRow,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  decorators: [(Story) => <div style={{ ...panel, width: 'var(--bb-derived-brand-diff-row-root-width)', maxWidth: '100%' }}><Story /></div>],
  argTypes: {
    state: { control: 'inline-radio', options: ['changed', 'unchanged'] },
    kind: { control: 'inline-radio', options: ['color', 'number'] },
  },
  args: { state: 'changed' },
} satisfies Meta<typeof BrandDiffRow>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const Changed: Story = { parameters: v('State=Changed') }
export const Unchanged: Story = { args: { state: 'unchanged', brand: 'Disney' }, parameters: v('State=Unchanged') }
export const ChangedNumber: Story = { args: { kind: 'number', old: '12px', new: '16px', brand: 'Ikea' } }

export const AcrossBrands: Story = {
  decorators: [],
  render: () => (
    <BrandGrid width="320px">
      <div style={{ ...panel, display: 'flex', flexDirection: 'column', gap: 'var(--bb-publish-space-tight)' }}>
        <BrandDiffRow />
        <BrandDiffRow state="unchanged" brand="Disney" />
      </div>
    </BrandGrid>
  ),
}
