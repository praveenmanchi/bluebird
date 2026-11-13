import type { Meta, StoryObj } from '@storybook/preact-vite'
import { LinkButton } from './LinkButton'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Atoms/LinkButton',
  component: LinkButton,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { children: 'Select all' },
} satisfies Meta<typeof LinkButton>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { parameters: { figma: { variant: 'Link Button' } } }
export const Restore: Story = { args: { children: 'Restore' } }
export const Disabled: Story = { args: { disabled: true } }
export const OpenInJira: Story = { args: { children: 'Open in Jira' } }
export const NoIcon: Story = { args: { children: 'Select all', icon: null } }
/** Every label rule from linkIcon.ts, as the Figma instances draw them. */
export const LabelIcons: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, max-content)', gap: 'var(--bb-space-inset-md)' }}>
      {['Open in Jira', 'Open', 'Refresh', 'Change', 'Edit', 'Ignore', 'Restore', 'Apply fix', 'Locate', 'Select all', 'Select on canvas',
        'Done', 'Delete', 'Reply', 'Manage sources', 'Add subtask', 'Attach link', 'Copy', 'Show all 16', 'Go to component', '← Back to history']
        .map((label) => <LinkButton key={label}>{label}</LinkButton>)}
    </div>
  ),
}
export const AcrossBrands: Story = { render: (args) => <BrandGrid><LinkButton {...args} /></BrandGrid> }
