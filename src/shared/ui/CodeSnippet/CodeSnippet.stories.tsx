import type { Meta, StoryObj } from '@storybook/preact-vite'
import { CodeSnippet } from './CodeSnippet'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Molecules/CodeSnippet',
  component: CodeSnippet,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { language: 'CSS', code: '.field__label {\n  color: var(--brand-text-on-accent);\n}', onCopy: () => undefined },
} satisfies Meta<typeof CodeSnippet>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'Code Snippet' } } }
export const Tsx: Story = { args: { language: 'TSX', code: '<Label tone="onAccent">Save</Label>' } }
export const AcrossBrands: Story = { render: (args) => <BrandGrid width="437px"><CodeSnippet {...args} /></BrandGrid> }
