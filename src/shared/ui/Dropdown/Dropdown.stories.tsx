import type { Meta, StoryObj } from '@storybook/preact-vite'
import { useState } from 'preact/hooks'
import { Dropdown } from './Dropdown'
import { DropdownMenu } from '../DropdownMenu/DropdownMenu'
import { MenuItem } from '../MenuItem/MenuItem'
import { figma } from './figma'
import { BrandGrid, VariantGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Organisms/Dropdown',
  component: Dropdown,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: { mode: { control: 'inline-radio', options: ['single', 'multi'] } },
  args: { value: 'All Pages', mode: 'single' },
  decorators: [(Story) => <div style={{ width: '220px' }}><Story /></div>],
} satisfies Meta<typeof Dropdown>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const SingleDefault: Story = { parameters: v('Type=Single, State=Default') }
export const SingleHover: Story = { args: { state: 'hover' }, parameters: v('Type=Single, State=Hover') }
export const SingleOpen: Story = { args: { open: true }, parameters: v('Type=Single, State=Open') }
export const SingleDisabled: Story = { args: { disabled: true }, parameters: v('Type=Single, State=Disabled') }
export const MultiDefault: Story = { args: { mode: 'multi', value: '3 selected' }, parameters: v('Type=Multi, State=Default') }
export const MultiHover: Story = { args: { mode: 'multi', value: '3 selected', state: 'hover' }, parameters: v('Type=Multi, State=Hover') }
export const MultiOpen: Story = { args: { mode: 'multi', value: '3 selected', open: true }, parameters: v('Type=Multi, State=Open') }
export const MultiDisabled: Story = { args: { mode: 'multi', value: '3 selected', disabled: true }, parameters: v('Type=Multi, State=Disabled') }

export const Matrix: Story = {
  decorators: [],
  render: (args) => (
    <VariantGrid columns={['Default', 'Hover', 'Open', 'Disabled']} rows={['Single', 'Multi']}>
      {(row, col) => (
        <div style={{ width: '220px' }}>
          <Dropdown {...args} mode={row.toLowerCase() as 'single' | 'multi'} value={row === 'Multi' ? '3 selected' : args.value} state={col === 'Hover' ? 'hover' : undefined} open={col === 'Open'} disabled={col === 'Disabled'} />
        </div>
      )}
    </VariantGrid>
  ),
}

const OPTIONS = ['Color', 'Typography', 'Spacing']

/** Mirrors the Figma "Dropdown & checkbox across brands" section (40000048:5252). */
export const AcrossBrands: Story = {
  decorators: [],
  render: () => (
    <BrandGrid width="246px">
      <Dropdown mode="multi" value="3 selected" open />
      <DropdownMenu>
        <MenuItem mode="multi" label="Select all" />
        <DropdownMenu.Divider />
        <MenuItem mode="multi" label="Color" count={12} selected />
        <MenuItem mode="multi" label="Typography" count={12} />
        <MenuItem mode="multi" label="Spacing" count={12} />
      </DropdownMenu>
    </BrandGrid>
  ),
}

/** Working multi-select: trigger + menu wired together. */
export const Interactive: Story = {
  decorators: [],
  render: () => {
    const [open, setOpen] = useState(true)
    const [picked, setPicked] = useState<string[]>(['Color'])
    const toggle = (o: string) => setPicked((p) => (p.includes(o) ? p.filter((x) => x !== o) : [...p, o]))
    return (
      <div style={{ width: '246px', display: 'flex', flexDirection: 'column', gap: 'var(--bb-space-stack-md)' }}>
        <Dropdown mode="multi" value={picked.length ? `${picked.length} selected` : undefined} placeholder="Select sections" open={open} onOpenChange={setOpen} />
        {open && (
          <DropdownMenu aria-label="Sections">
            <MenuItem mode="multi" label="Select all" selected={picked.length === OPTIONS.length} onSelect={() => setPicked(picked.length === OPTIONS.length ? [] : OPTIONS)} />
            <DropdownMenu.Divider />
            {OPTIONS.map((o) => <MenuItem key={o} mode="multi" label={o} count={12} selected={picked.includes(o)} onSelect={() => toggle(o)} />)}
          </DropdownMenu>
        )}
      </div>
    )
  },
}
