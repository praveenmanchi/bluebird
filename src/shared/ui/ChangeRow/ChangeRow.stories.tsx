import type { Meta, StoryObj } from '@storybook/preact-vite'
import { ChangeRow } from './ChangeRow'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

/** The Publish tab paints these on its panel surface. */
const panel = { background: 'var(--bb-publish-surface-panel)', padding: 'var(--bb-publish-space-panel)' }

const meta = {
  title: 'Molecules/ChangeRow',
  component: ChangeRow,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  decorators: [(Story) => <div style={{ ...panel, width: 'var(--bb-derived-change-row-root-width)' }}><Story /></div>],
  argTypes: {
    kind: { control: 'inline-radio', options: ['color', 'number', 'component'] },
    state: { control: 'inline-radio', options: ['default', 'selected'] },
    change: { control: 'inline-radio', options: ['added', 'modified', 'removed', 'deprecated'] },
  },
  args: { kind: 'color', state: 'default' },
} satisfies Meta<typeof ChangeRow>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const ColorDefault: Story = { parameters: v('Kind=Color, State=Default') }
export const ColorSelected: Story = { args: { state: 'selected' }, parameters: v('Kind=Color, State=Selected') }
export const NumberDefault: Story = { args: { kind: 'number' }, parameters: v('Kind=Number, State=Default') }
export const NumberSelected: Story = { args: { kind: 'number', state: 'selected' }, parameters: v('Kind=Number, State=Selected') }
export const ComponentDefault: Story = { args: { kind: 'component' }, parameters: v('Kind=Component, State=Default') }
export const ComponentSelected: Story = { args: { kind: 'component', state: 'selected' }, parameters: v('Kind=Component, State=Selected') }

export const ChangeKinds: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bb-publish-space-tight)' }}>
      <ChangeRow {...args} change="added" name="button/bg/success" detail="New in 3 of 8 brands" />
      <ChangeRow {...args} change="modified" />
      <ChangeRow {...args} kind="number" change="removed" name="space/legacy-gutter" detail="Removed from all brands" />
      <ChangeRow {...args} kind="component" change="deprecated" name="Badge/Legacy" detail="Use Meta Badge instead" included={false} />
    </div>
  ),
}

export const AcrossBrands: Story = {
  decorators: [],
  render: () => (
    <BrandGrid width="400px">
      <div style={{ ...panel, display: 'flex', flexDirection: 'column', gap: 'var(--bb-publish-space-tight)' }}>
        <ChangeRow />
        <ChangeRow state="selected" kind="number" />
        <ChangeRow kind="component" change="added" />
      </div>
    </BrandGrid>
  ),
}
