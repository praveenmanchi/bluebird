import type { Meta, StoryObj } from '@storybook/preact-vite'
import { ButtonGroup } from './ButtonGroup'
import { Button } from '../Button/Button'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/ButtonGroup',
  component: ButtonGroup,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { primaryLabel: 'Save Configuration', secondaryLabel: 'Test Connection' },
} satisfies Meta<typeof ButtonGroup>
export default meta
type Story = StoryObj<typeof meta>

/** The single Figma variant: Test Connection (Secondary) + Save Configuration (Primary). */
export const Container: Story = { parameters: { figma: { variant: 'Container' } } }

export const PrimaryDisabled: Story = { args: { primaryDisabled: true } }
export const Saving: Story = { args: { primaryLoading: true } }
export const CustomChildren: Story = {
  render: (args) => (
    <ButtonGroup {...args}>
      <Button variant="secondary">Cancel</Button>
      <Button variant="secondary">Reset</Button>
      <Button leadingIcon="variables">Apply</Button>
    </ButtonGroup>
  ),
}

export const AcrossBrands: Story = {
  render: (args) => (
    <BrandGrid width="320px">
      <ButtonGroup {...args} />
      <ButtonGroup {...args} primaryDisabled />
    </BrandGrid>
  ),
}
