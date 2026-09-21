import type { Meta, StoryObj } from '@storybook/preact-vite'
import { useState } from 'preact/hooks'
import { SelectField } from './SelectField'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/SelectField',
  component: SelectField,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: { labelIcon: { control: 'select', options: [undefined, 'variables', 'component', 'text'] } },
  args: { value: 'Label Input label', placeholder: 'Select' },
} satisfies Meta<typeof SelectField>
export default meta
type Story = StoryObj<typeof meta>

/** Figma "dropdown" (215:12201): the bare field. */
export const Dropdown: Story = { parameters: { figma: { variant: 'dropdown' } } }
/** Figma "dropbox" (215:12356) alias: the same field with a label title above. */
export const Labeled: Story = { args: { label: 'Label Title', labelIcon: 'variables' } }
export const Placeholder: Story = { args: { value: undefined } }
export const Hover: Story = { args: { state: 'hover' } }
export const Open: Story = { args: { open: true } }
export const Disabled: Story = { args: { disabled: true } }
export const WithHelper: Story = { args: { label: 'Label Title', helper: 'Input bottom label' } }
export const WithEye: Story = { args: { revealIcon: true } }

export const Interactive: Story = {
  render: (args) => {
    const [open, setOpen] = useState(false)
    return <SelectField {...args} open={open} onClick={() => setOpen((o) => !o)} />
  },
}

export const AcrossBrands: Story = {
  render: (args) => (
    <BrandGrid>
      <SelectField {...args} label="Label Title" />
      <SelectField {...args} value={undefined} />
      <SelectField {...args} open />
      <SelectField {...args} disabled />
    </BrandGrid>
  ),
}
