import type { Meta, StoryObj } from '@storybook/preact-vite'
import { ChangeItem } from './ChangeItem'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

/** The Publish tab paints these on its panel surface. */
const panel = { background: 'var(--bb-publish-surface-panel)', padding: 'var(--bb-publish-space-panel)' }

const meta = {
  title: 'Organisms/ChangeItem',
  component: ChangeItem,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  decorators: [(Story) => <div style={{ ...panel, width: 'var(--bb-derived-change-item-root-width)', maxWidth: '100%' }}><Story /></div>],
  args: { expanded: false },
} satisfies Meta<typeof ChangeItem>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const Collapsed: Story = { parameters: v('Expanded=No') }
export const Expanded: Story = { args: { expanded: true }, parameters: v('Expanded=Yes') }

/** Uncontrolled: the item keeps its own Expanded state. */
export const Interactive: Story = { render: () => <ChangeItem /> }

export const Spacing: Story = {
  args: {
    expanded: true,
    row: { kind: 'number', name: 'space/gutter', detail: '12px → 16px · 2 of 5 brands', change: 'modified' },
    brandValues: [
      { brand: 'Bridge', state: 'changed', kind: 'number', old: '12px', new: '16px' },
      { brand: 'Ikea', state: 'changed', kind: 'number', old: '12px', new: '16px' },
      { brand: 'Disney', state: 'unchanged', value: '12px' },
    ],
    usedIn: ['Card', 'Dialog'],
    source: 'Brand UI › space/gutter · scopes Gap · changed by Praveen, 1 d ago',
  },
}

export const AcrossBrands: Story = {
  decorators: [],
  render: () => (
    <BrandGrid width="480px">
      <div style={{ ...panel, display: 'flex', flexDirection: 'column', gap: 'var(--bb-publish-space-tight)' }}>
        <ChangeItem />
        <ChangeItem expanded />
      </div>
    </BrandGrid>
  ),
}
