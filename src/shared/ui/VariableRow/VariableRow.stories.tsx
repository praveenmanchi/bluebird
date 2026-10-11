import type { Meta, StoryObj } from '@storybook/preact-vite'
import { VariableRow } from './VariableRow'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/VariableRow',
  component: VariableRow,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: {
    kind: { control: 'inline-radio', options: ['color', 'number'] },
    state: { control: 'inline-radio', options: ['default', 'changed'] },
  },
  args: { kind: 'color', state: 'default', onChange: () => undefined },
} satisfies Meta<typeof VariableRow>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const ColorDefault: Story = { parameters: v('Kind=Color, State=Default') }
export const ColorChanged: Story = { args: { state: 'changed' }, parameters: v('Kind=Color, State=Changed') }
export const NumberDefault: Story = { args: { kind: 'number' }, parameters: v('Kind=Number, State=Default') }
export const NumberChanged: Story = { args: { kind: 'number', state: 'changed' }, parameters: v('Kind=Number, State=Changed') }
export const WithOptions: Story = {
  args: {
    color: 'var(--bb-surface-accent-subtle)',
    options: ['surface/accent', 'surface/accent-subtle', 'surface/accent-strong'],
  },
}

export const AcrossBrands: Story = {
  render: () => (
    <BrandGrid width="640px">
      <VariableRow color="var(--bb-surface-accent-subtle)" />
      <VariableRow kind="number" state="changed" />
    </BrandGrid>
  ),
}
