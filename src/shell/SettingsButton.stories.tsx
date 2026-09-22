import type { Meta, StoryObj } from '@storybook/preact-vite'
import { SettingsButton } from './SettingsButton'
import { figma } from './SettingsButton.figma'
import { BrandGrid } from '../../.storybook/helpers'

const meta = { title: 'Shell/SettingsButton', component: SettingsButton, parameters: { figma: { setId: figma.setId, name: figma.name } } } satisfies Meta<typeof SettingsButton>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'Property 1=Default' } } }
export const Active: Story = { args: { active: true }, parameters: { figma: { variant: 'Property 1=Variant2' } } }
export const AcrossBrands: Story = { render: () => <BrandGrid width="120px"><div style={{ display: 'flex', gap: 'var(--bb-space-inline-md)' }}><SettingsButton /><SettingsButton active /></div></BrandGrid> }
