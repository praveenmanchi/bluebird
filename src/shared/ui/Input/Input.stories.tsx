import type { Meta, StoryObj } from '@storybook/preact-vite'
import { useState } from 'preact/hooks'
import { Input } from './Input'
import { figma } from './figma'
import { BrandGrid, VariantGrid } from '../../../../.storybook/helpers'

const HELPER = 'To store all tokens in a single JSON file, write the file name (Ex: tokens.json). Pro features, like themes, require a multi-file sync with tokens stored in a folder by writing the folder path (Ex: tokens).'

const meta = {
  title: 'Molecules/Input',
  component: Input,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: {
    icon: { control: 'select', options: [undefined, 'variables', 'accessibility', 'settings', 'file'] },
    state: { control: 'inline-radio', options: [undefined, 'focus'] },
  },
  args: { label: 'Label Title', icon: 'variables', password: true, value: 'Label Input label', helperText: HELPER },
} satisfies Meta<typeof Input>
export default meta
type Story = StoryObj<typeof meta>

/** The single Figma variant with every boolean on. */
export const InputBox: Story = { parameters: { figma: { variant: 'Input Box' } } }

export const Plain: Story = { args: { icon: undefined, password: false, helperText: undefined, value: '', placeholder: 'Enter a value' } }
export const Focus: Story = { args: { state: 'focus' } }
export const Error: Story = { args: { error: true, helperText: 'This field is required.' } }
export const Disabled: Story = { args: { disabled: true } }

export const Interactive: Story = {
  render: (args) => {
    const [value, setValue] = useState(args.value ?? '')
    return <Input {...args} value={value} onValueChange={setValue} />
  },
}

/** Field states × helper/eye options. */
export const Matrix: Story = {
  render: (args) => (
    <VariantGrid columns={['Default', 'Focus', 'Error', 'Disabled']} rows={['Eye', 'Plain']}>
      {(row, col) => (
        <Input
          {...args}
          password={row === 'Eye'}
          helperText={undefined}
          state={col === 'Focus' ? 'focus' : undefined}
          error={col === 'Error'}
          disabled={col === 'Disabled'}
        />
      )}
    </VariantGrid>
  ),
}

export const AcrossBrands: Story = {
  render: (args) => (
    <BrandGrid width="320px">
      <Input {...args} helperText={undefined} />
      <Input {...args} helperText={undefined} error />
      <Input {...args} helperText={undefined} disabled />
    </BrandGrid>
  ),
}
