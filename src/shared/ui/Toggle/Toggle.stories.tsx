import type { Meta, StoryObj } from '@storybook/preact-vite'
import { useState } from 'preact/hooks'
import { Toggle } from './Toggle'
import { figma } from './figma'
import { BrandGrid, VariantGrid } from '../../../../.storybook/helpers'

const DESCRIPTION = 'To store all tokens in a single JSON file, write the file name (Ex: tokens.json). Pro features, like themes, require a multi-file sync with tokens stored in a folder by writing the folder path (Ex: tokens).'

const meta = {
  title: 'Molecules/Toggle',
  component: Toggle,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { title: '[ Label ]', description: DESCRIPTION, checked: true },
} satisfies Meta<typeof Toggle>
export default meta
type Story = StoryObj<typeof meta>

/** The single Figma variant: Switch Status=On with title and description. */
export const Default: Story = { parameters: { figma: { variant: 'Toggle' } } }

export const Off: Story = { args: { checked: false } }
export const Disabled: Story = { args: { disabled: true } }
export const SwitchOnly: Story = { args: { title: undefined, description: undefined, label: 'Enable sync' } }

export const Interactive: Story = {
  render: (args) => {
    const [checked, setChecked] = useState(args.checked ?? false)
    return <Toggle {...args} checked={checked} onChange={setChecked} />
  },
}

export const Matrix: Story = {
  render: (args) => (
    <VariantGrid columns={['Enabled', 'Disabled']} rows={['On', 'Off']}>
      {(row, col) => <Toggle {...args} title={undefined} description={undefined} label={`${row} ${col}`} checked={row === 'On'} disabled={col === 'Disabled'} />}
    </VariantGrid>
  ),
}

export const AcrossBrands: Story = {
  render: (args) => (
    <BrandGrid width="320px">
      <Toggle {...args} description="Compare local variables against GitHub before creating a PR." />
      <Toggle {...args} checked={false} description="Compare local variables against GitHub before creating a PR." />
    </BrandGrid>
  ),
}
