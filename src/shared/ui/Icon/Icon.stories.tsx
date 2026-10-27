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

/** The Figma UI icon sets (Icons page → "UI icons"), grouped by set: `ui-<set>-<glyph>`. */
export const UiIcons: Story = {
  render: (args) => {
    const groups = new Map<string, IconName[]>()
    for (const name of Object.keys(ICONS) as IconName[]) {
      if (!name.startsWith('ui-')) continue
      const set = /^ui-(app|auto-layout|ai-feature|[a-z]+)-/.exec(name)?.[1] ?? 'other'
      groups.set(set, [...(groups.get(set) ?? []), name])
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bb-space-stack-md)', color: 'var(--bb-card-variable-meta-fg)', fontSize: 'var(--bb-font-size-caption)' }}>
        {[...groups].map(([set, names]) => (
          <section key={set}>
            <p>{set} · {names.length}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--bb-space-inline-xs)' }}>
              {names.map((name) => <span key={name} title={name}><Icon {...args} name={name} /></span>)}
            </div>
          </section>
        ))}
      </div>
    )
  },
  args: { size: 'md' },
}
