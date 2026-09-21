import type { Meta, StoryObj } from '@storybook/preact-vite'
import { Icon, ICONS, type IconName } from './Icon'

const meta = {
  title: 'Atoms/Icon',
  component: Icon,
  parameters: { figma: { setId: '91:1959', name: 'Tab Icons' } },
  argTypes: {
    name: { control: 'select', options: Object.keys(ICONS) },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    tone: { control: 'inline-radio', options: ['default', 'muted', 'on-accent'] },
  },
  args: { name: 'variables' as IconName, size: 'lg', tone: 'default' },
} satisfies Meta<typeof Icon>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const AllGlyphs: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, max-content)', gap: 'var(--bb-space-stack-md)' }}>
      {(Object.keys(ICONS) as IconName[]).map((name) => (
        <div key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--bb-space-inline-xs)', color: 'var(--bb-card-variable-meta-fg)', fontSize: 'var(--bb-font-size-caption)' }}>
          <Icon {...args} name={name} />
          <span>{name}</span>
        </div>
      ))}
    </div>
  ),
}
