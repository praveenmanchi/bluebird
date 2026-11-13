import type { Meta, StoryObj } from '@storybook/preact-vite'
import { useState } from 'preact/hooks'
import { Checkbox, type CheckboxChecked } from './Checkbox'
import { figma } from './figma'
import { BrandGrid, VariantGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Atoms/Checkbox',
  component: Checkbox,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: { checked: { control: 'inline-radio', options: [false, true, 'mixed'] }, state: { control: 'inline-radio', options: ['default', 'hover', 'focus'] } },
  args: { label: 'Checkbox label', checked: false },
} satisfies Meta<typeof Checkbox>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const UncheckedDefault: Story = { parameters: v('Selected=Unchecked, State=Default') }
export const UncheckedHover: Story = { args: { state: 'hover' }, parameters: v('Selected=Unchecked, State=Hover') }
export const UncheckedDisabled: Story = { args: { disabled: true }, parameters: v('Selected=Unchecked, State=Disabled') }
export const CheckedDefault: Story = { args: { checked: true }, parameters: v('Selected=Checked, State=Default') }
export const CheckedHover: Story = { args: { checked: true, state: 'hover' }, parameters: v('Selected=Checked, State=Hover') }
export const CheckedDisabled: Story = { args: { checked: true, disabled: true }, parameters: v('Selected=Checked, State=Disabled') }
export const IndeterminateDefault: Story = { args: { checked: 'mixed' }, parameters: v('Selected=Indeterminate, State=Default') }
export const IndeterminateHover: Story = { args: { checked: 'mixed', state: 'hover' }, parameters: v('Selected=Indeterminate, State=Hover') }
export const IndeterminateDisabled: Story = { args: { checked: 'mixed', disabled: true }, parameters: v('Selected=Indeterminate, State=Disabled') }
export const UncheckedFocus: Story = { args: { state: 'focus' }, parameters: v('Selected=Unchecked, State=Focus') }
export const CheckedFocus: Story = { args: { checked: true, state: 'focus' }, parameters: v('Selected=Checked, State=Focus') }
export const IndeterminateFocus: Story = { args: { checked: 'mixed', state: 'focus' }, parameters: v('Selected=Indeterminate, State=Focus') }

export const Interactive: Story = {
  render: (args) => {
    const [checked, setChecked] = useState<CheckboxChecked>(args.checked ?? false)
    return <Checkbox {...args} checked={checked} onChange={setChecked} />
  },
}

export const Matrix: Story = {
  render: (args) => (
    <VariantGrid columns={['Default', 'Hover', 'Disabled', 'Focus']} rows={['Unchecked', 'Checked', 'Indeterminate']}>
      {(row, col) => <Checkbox {...args} checked={row === 'Checked' ? true : row === 'Indeterminate' ? 'mixed' : false} state={col === 'Hover' ? 'hover' : col === 'Focus' ? 'focus' : undefined} disabled={col === 'Disabled'} />}
    </VariantGrid>
  ),
}

export const AcrossBrands: Story = {
  render: (args) => (
    <BrandGrid>
      <Checkbox {...args} />
      <Checkbox {...args} checked />
      <Checkbox {...args} checked="mixed" />
      <Checkbox {...args} checked disabled />
    </BrandGrid>
  ),
}
