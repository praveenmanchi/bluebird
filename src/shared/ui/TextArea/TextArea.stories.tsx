import type { Meta, StoryObj } from '@storybook/preact-vite'
import { useState } from 'preact/hooks'
import { TextArea } from './TextArea'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/TextArea',
  component: TextArea,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  decorators: [(Story) => <div style={{ width: '466px', padding: '4px' }}><Story /></div>],
  args: {
    label: 'Custom Instructions (optional)',
    placeholder: 'Add any custom instructions…',
    helperText: 'These instructions will be included in every AI analysis prompt to guide the assistant’s behavior.',
  },
} satisfies Meta<typeof TextArea>
export default meta
type Story = StoryObj<typeof meta>

const filled = 'Use our naming: component/variant/state. Prefer semantic tokens over brand primitives.'

export const Default: Story = { parameters: { figma: { variant: 'State=Default' } } }
export const Focused: Story = { args: { state: 'focused' }, parameters: { figma: { variant: 'State=Focused' } } }
export const Filled: Story = { args: { value: filled }, parameters: { figma: { variant: 'State=Filled' } } }
export const Disabled: Story = { args: { disabled: true }, parameters: { figma: { variant: 'State=Disabled' } } }

/** Type into it; the field grows by dragging its corner. */
export const Interactive: Story = {
  render: (args) => {
    const [value, setValue] = useState('')
    return <TextArea {...args} value={value} onValueChange={setValue} />
  },
}

export const AcrossBrands: Story = {
  render: (args) => (
    <BrandGrid width="466px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '4px' }}>
        <TextArea {...args} />
        <TextArea {...args} value={filled} />
        <TextArea {...args} disabled />
      </div>
    </BrandGrid>
  ),
}
