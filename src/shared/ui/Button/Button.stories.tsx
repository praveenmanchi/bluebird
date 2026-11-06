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
    size: { control: 'inline-radio', options: ['md', 'lg'] },
    leadingIcon: { control: 'select', options: [undefined, 'ui-general-add', 'ui-general-check', 'ui-misc-save', 'ui-general-x', 'accessibility', 'inspect', 'component'] },
    trailingIcon: { control: 'select', options: [undefined, 'dropdown-down', 'dropdown-up'] },
  },
  args: { variant: 'primary', children: 'Button', leadingIcon: 'ui-general-add', width: 'fixed' },
} satisfies Meta<typeof Button>
export default meta
type Story = StoryObj<typeof meta>

// One story per Figma variant, named after it, so coverage tests can pair them.
export const PrimaryDefault: Story = { parameters: { figma: { variant: 'Type=Primary, State=Default, Size=Medium' } } }
export const PrimaryHover: Story = { args: { state: 'hover' }, parameters: { figma: { variant: 'Type=Primary, State=Hover, Size=Medium' } } }
export const PrimaryDisabled: Story = { args: { disabled: true }, parameters: { figma: { variant: 'Type=Primary, State=Disabled, Size=Medium' } } }
export const SecondaryDefault: Story = { args: { variant: 'secondary' }, parameters: { figma: { variant: 'Type=Secondary, State=Default, Size=Medium' } } }
export const SecondaryHover: Story = { args: { variant: 'secondary', state: 'hover' }, parameters: { figma: { variant: 'Type=Secondary, State=Hover, Size=Medium' } } }
export const SecondaryDisabled: Story = { args: { variant: 'secondary', disabled: true }, parameters: { figma: { variant: 'Type=Secondary, State=Disabled, Size=Medium' } } }
export const PrimaryLarge: Story = { args: { size: 'lg' }, parameters: { figma: { variant: 'Type=Primary, State=Default, Size=Large' } } }
export const PrimaryLargeHover: Story = { args: { size: 'lg', state: 'hover' }, parameters: { figma: { variant: 'Type=Primary, State=Hover, Size=Large' } } }
export const PrimaryLargeDisabled: Story = { args: { size: 'lg', disabled: true }, parameters: { figma: { variant: 'Type=Primary, State=Disabled, Size=Large' } } }
export const SecondaryLarge: Story = { args: { size: 'lg', variant: 'secondary' }, parameters: { figma: { variant: 'Type=Secondary, State=Default, Size=Large' } } }
export const SecondaryLargeHover: Story = { args: { size: 'lg', variant: 'secondary', state: 'hover' }, parameters: { figma: { variant: 'Type=Secondary, State=Hover, Size=Large' } } }
export const SecondaryLargeDisabled: Story = { args: { size: 'lg', variant: 'secondary', disabled: true }, parameters: { figma: { variant: 'Type=Secondary, State=Disabled, Size=Large' } } }

export const Loading: Story = { args: { loading: true } }
export const TrailingIcon: Story = { args: { leadingIcon: undefined, trailingIcon: 'dropdown-down', children: 'All pages' } }

/** Mirrors the Figma component set frame: (Type × Size) × State. */
export const Matrix: Story = {
  render: (args) => (
    <VariantGrid columns={['Default', 'Hover', 'Disabled']} rows={['Primary · Medium', 'Secondary · Medium', 'Primary · Large', 'Secondary · Large']}>
      {(row, col) => <Button {...args} variant={row.startsWith('Primary') ? 'primary' : 'secondary'} size={row.endsWith('Large') ? 'lg' : 'md'} state={col === 'Hover' ? 'hover' : undefined} disabled={col === 'Disabled'} />}
    </VariantGrid>
  ),
}

/** Mirrors the Figma "Button across brands" section (40000041:10055). */
export const AcrossBrands: Story = {
  render: (args) => (
    <BrandGrid>
      <Button {...args} width="hug">Save configuration</Button>
      <Button {...args} width="hug" variant="secondary">Test connection</Button>
      <Button {...args} width="hug" disabled>Save configuration</Button>
      <Button {...args} width="hug" variant="secondary" disabled>Test connection</Button>
    </BrandGrid>
  ),
}
