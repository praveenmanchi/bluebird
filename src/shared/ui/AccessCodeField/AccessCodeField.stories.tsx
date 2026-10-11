import type { Meta, StoryObj } from '@storybook/preact-vite'
import { useState } from 'preact/hooks'
import { AccessCodeField } from './AccessCodeField'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/AccessCodeField',
  component: AccessCodeField,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  decorators: [(Story) => <div style={{ width: '344px', padding: '4px' }}><Story /></div>],
} satisfies Meta<typeof AccessCodeField>
export default meta
type Story = StoryObj<typeof meta>

const code = 'BRIDGE-2026'

export const Default: Story = { args: { state: 'default' }, parameters: { figma: { variant: 'State=Default' } } }
export const Focused: Story = { args: { state: 'focused', value: 'BRIDGE' }, parameters: { figma: { variant: 'State=Focused' } } }
export const Filled: Story = { args: { state: 'filled', value: code }, parameters: { figma: { variant: 'State=Filled' } } }
export const ErrorState: Story = { args: { state: 'error', value: code }, parameters: { figma: { variant: 'State=Error' } } }
export const Success: Story = { args: { state: 'success', value: code }, parameters: { figma: { variant: 'State=Success' } } }
export const Disabled: Story = { args: { state: 'disabled', value: code }, parameters: { figma: { variant: 'State=Disabled' } } }

/** Type, tab away, toggle the eye. */
export const Interactive: Story = {
  render: () => {
    const [value, setValue] = useState('')
    return <AccessCodeField value={value} onValueChange={setValue} />
  },
}

export const AcrossBrands: Story = {
  render: () => (
    <BrandGrid width="344px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '4px' }}>
        <AccessCodeField state="focused" value="BRIDGE" />
        <AccessCodeField state="error" value={code} />
        <AccessCodeField state="success" value={code} />
      </div>
    </BrandGrid>
  ),
}
