import type { Meta, StoryObj } from '@storybook/preact-vite'
import { Button } from './Button'
import { figma } from './figma'
import { BrandGrid, VariantGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/Button',
  component: Button,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: {
    variant: { control: 'inline-radio', options: ['primary', 'secondary'] },
    leadingIcon: { control: 'select', options: [undefined, 'variables', 'accessibility', 'inspect', 'component'] },
    trailingIcon: { control: 'select', options: [undefined, 'dropdown-down', 'dropdown-up'] },
  },
  args: { variant: 'primary', children: 'Button', leadingIcon: 'variables' },
} satisfies Meta<typeof Button>
export default meta
type Story = StoryObj<typeof meta>

// One story per Figma variant, named after it, so coverage tests can pair them.
export const PrimaryDefault: Story = { parameters: { figma: { variant: 'Type=Primary, State=Default' } } }
export const PrimaryHover: Story = { args: { state: 'hover' }, parameters: { figma: { variant: 'Type=Primary, State=Hover' } } }
export const PrimaryDisabled: Story = { args: { disabled: true }, parameters: { figma: { variant: 'Type=Primary, State=Disabled' } } }
export const SecondaryDefault: Story = { args: { variant: 'secondary' }, parameters: { figma: { variant: 'Type=Secondary, State=Default' } } }
export const SecondaryHover: Story = { args: { variant: 'secondary', state: 'hover' }, parameters: { figma: { variant: 'Type=Secondary, State=Hover' } } }
export const SecondaryDisabled: Story = { args: { variant: 'secondary', disabled: true }, parameters: { figma: { variant: 'Type=Secondary, State=Disabled' } } }

export const Loading: Story = { args: { loading: true } }
export const TrailingIcon: Story = { args: { leadingIcon: undefined, trailingIcon: 'dropdown-down', children: 'All pages' } }

/** Mirrors the Figma component set frame: Type × State. */
export const Matrix: Story = {
  render: (args) => (
    <VariantGrid columns={['Default', 'Hover', 'Disabled']} rows={['Primary', 'Secondary']}>
      {(row, col) => <Button {...args} variant={row.toLowerCase() as 'primary' | 'secondary'} state={col === 'Hover' ? 'hover' : undefined} disabled={col === 'Disabled'} />}
    </VariantGrid>
  ),
}

/** Mirrors the Figma "Button across brands" section (40000041:10055). */
export const AcrossBrands: Story = {
  render: (args) => (
    <BrandGrid>
      <Button {...args}>Save Configuration</Button>
      <Button {...args} variant="secondary">Test Connection</Button>
      <Button {...args} disabled>Save Configuration</Button>
      <Button {...args} variant="secondary" disabled>Test Connection</Button>
    </BrandGrid>
  ),
}
