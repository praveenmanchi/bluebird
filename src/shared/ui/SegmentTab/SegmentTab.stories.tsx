import type { Meta, StoryObj } from '@storybook/preact-vite'
import { SegmentTab } from './SegmentTab'
import { figma } from './figma'
import { BrandGrid, VariantGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/SegmentTab',
  component: SegmentTab,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: { icon: { control: 'select', options: [undefined, 'ui-variable-text', 'ui-toolbar-dev-brackets', 'ui-toolbar-component'] } },
  // The set's Icon default is UI Icons / Variable › text.
  args: { children: 'Label', icon: 'ui-variable-text' },
} satisfies Meta<typeof SegmentTab>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'State=Default' } } }
export const Hover: Story = { args: { state: 'hover' }, parameters: { figma: { variant: 'State=Hover' } } }
export const Selected: Story = { args: { selected: true }, parameters: { figma: { variant: 'State=Selected' } } }
export const Disabled: Story = { args: { disabled: true }, parameters: { figma: { variant: 'State=Disabled' } } }
export const TextOnly: Story = { args: { icon: undefined } }

/** State × Show icon. */
export const Matrix: Story = {
  render: (args) => (
    <VariantGrid columns={['Icon', 'Text only']} rows={['Default', 'Hover', 'Selected', 'Disabled']}>
      {(row, col) => (
        <SegmentTab
          {...args}
          selected={row === 'Selected'}
          state={row === 'Hover' ? 'hover' : undefined}
          disabled={row === 'Disabled'}
          icon={col === 'Icon' ? args.icon : undefined}
        />
      )}
    </VariantGrid>
  ),
}

export const AcrossBrands: Story = {
  render: (args) => (
    <BrandGrid>
      <SegmentTab {...args} icon="ui-toolbar-dev-brackets">JSON</SegmentTab>
      <SegmentTab {...args} selected />
    </BrandGrid>
  ),
}
