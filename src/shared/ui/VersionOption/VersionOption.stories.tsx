import type { Meta, StoryObj } from '@storybook/preact-vite'
import { useState } from 'preact/hooks'
import { VersionOption, type VersionBump } from './VersionOption'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

/** The Publish tab paints these on its panel surface. */
const panel = { background: 'var(--bb-publish-surface-panel)', padding: 'var(--bb-publish-space-panel)' }

const meta = {
  title: 'Molecules/VersionOption',
  component: VersionOption,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  decorators: [(Story) => <div style={{ ...panel, display: 'flex', width: 'var(--bb-derived-version-option-root-width)' }}><Story /></div>],
  argTypes: {
    bump: { control: 'inline-radio', options: ['patch', 'minor', 'major'] },
    onSelect: { action: 'select' },
  },
  args: { bump: 'patch', selected: false, suggested: false },
} satisfies Meta<typeof VersionOption>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const PatchUnselected: Story = { parameters: v('Bump=Patch, Selected=No') }
export const PatchSelected: Story = { args: { selected: true }, parameters: v('Bump=Patch, Selected=Yes') }
export const MinorUnselected: Story = { args: { bump: 'minor' }, parameters: v('Bump=Minor, Selected=No') }
export const MinorSelected: Story = { args: { bump: 'minor', selected: true }, parameters: v('Bump=Minor, Selected=Yes') }
export const MajorUnselected: Story = { args: { bump: 'major' }, parameters: v('Bump=Major, Selected=No') }
export const MajorSelected: Story = { args: { bump: 'major', selected: true }, parameters: v('Bump=Major, Selected=Yes') }
export const Suggested: Story = { args: { bump: 'minor', suggested: true, selected: true, version: 'v2.6.0' } }

const OPTIONS: { bump: VersionBump; version: string; hint: string }[] = [
  { bump: 'patch', version: 'v2.5.1', hint: 'Fixes and value tweaks' },
  { bump: 'minor', version: 'v2.6.0', hint: 'New tokens or components' },
  { bump: 'major', version: 'v3.0.0', hint: 'Breaking renames or removals' },
]

/** Three options in a radiogroup: click or use the arrow keys. */
export const Group: Story = {
  decorators: [],
  render: () => {
    const [value, setValue] = useState<VersionBump>('minor')
    return (
      <div role="radiogroup" aria-label="Version bump" style={{ ...panel, display: 'flex', gap: 'var(--bb-publish-space-inline)', width: '400px' }}>
        {OPTIONS.map((o) => <VersionOption key={o.bump} {...o} name="story-bump" suggested={o.bump === 'minor'} selected={value === o.bump} onSelect={() => setValue(o.bump)} />)}
      </div>
    )
  },
}

export const AcrossBrands: Story = {
  decorators: [],
  render: () => (
    <BrandGrid width="400px">
      <div style={{ ...panel, display: 'flex', gap: 'var(--bb-publish-space-inline)' }}>
        <VersionOption bump="patch" version="v2.5.1" />
        <VersionOption bump="minor" version="v2.6.0" suggested selected />
      </div>
    </BrandGrid>
  ),
}
