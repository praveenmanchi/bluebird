import type { Meta, StoryObj } from '@storybook/preact-vite'
import { ThemeChip, THEME_CHIP_THEMES, type ThemeChipTheme } from './ThemeChip'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/ThemeChip',
  component: ThemeChip,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: { theme: { control: 'select', options: Object.keys(THEME_CHIP_THEMES) } },
  args: { theme: 'forms' },
} satisfies Meta<typeof ThemeChip>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const Forms: Story = { args: { theme: 'forms' }, parameters: v('Theme type=Forms') }
export const Gestures: Story = { args: { theme: 'gestures' }, parameters: v('Theme type=Gestures') }
export const Keyboard: Story = { args: { theme: 'keyboard' }, parameters: v('Theme type=Keyboard') }
export const Sensory: Story = { args: { theme: 'sensory' }, parameters: v('Theme type=Sensory') }
export const WholeSite: Story = { args: { theme: 'whole-site' }, parameters: v('Theme type=Whole Site') }
export const Wording: Story = { args: { theme: 'wording' }, parameters: v('Theme type=Wording') }
export const ZoomAndLegibility: Story = { args: { theme: 'zoom' }, parameters: v('Theme type=Zoom and Legibility') }

export const AllThemes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--bb-space-inline-sm)' }}>
      {(Object.keys(THEME_CHIP_THEMES) as ThemeChipTheme[]).map((t) => <ThemeChip key={t} theme={t} />)}
    </div>
  ),
}

export const AcrossBrands: Story = {
  render: () => (
    <BrandGrid width="200px">
      <ThemeChip theme="forms" />
      <ThemeChip theme="keyboard" />
      <ThemeChip theme="zoom" />
    </BrandGrid>
  ),
}
