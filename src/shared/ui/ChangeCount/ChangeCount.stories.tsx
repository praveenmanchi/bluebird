import type { Meta, StoryObj } from '@storybook/preact-vite'
import { ChangeCount } from './ChangeCount'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Atoms/ChangeCount',
  component: ChangeCount,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: {
    type: { control: 'inline-radio', options: ['default', 'added', 'modified', 'removed'] },
    display: { control: 'inline-radio', options: ['icon-label', 'icon', 'label'] },
    surface: { control: 'inline-radio', options: ['app', 'report'] },
  },
  args: { type: 'added', display: 'icon-label', surface: 'app', count: 12 },
} satisfies Meta<typeof ChangeCount>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const Default: Story = { args: { type: 'default', count: 0 }, parameters: v('Type=Default, Display=Icon + label, Surface=App') }
export const Added: Story = { args: { type: 'added', count: 0 }, parameters: v('Type=Added, Display=Icon + label, Surface=App') }
export const Modified: Story = { args: { type: 'modified', count: 0 }, parameters: v('Type=Modified, Display=Icon + label, Surface=App') }
export const Removed: Story = { args: { type: 'removed', count: 0 }, parameters: v('Type=Removed, Display=Icon + label, Surface=App') }
export const IconOnly: Story = { args: { type: 'added', display: 'icon', count: 0 }, parameters: v('Type=Added, Display=Icon, Surface=App') }
export const LabelOnly: Story = { args: { type: 'added', display: 'label', count: 0 }, parameters: v('Type=Added, Display=Label, Surface=App') }
export const Report: Story = {
  args: { type: 'added', surface: 'report', count: 0 },
  parameters: { ...v('Type=Added, Display=Icon + label, Surface=Report'), backgrounds: { default: 'light' } },
  decorators: [(S) => <div style={{ background: 'var(--bb-a11y-report-surface-page)', padding: 12 }}><S /></div>],
}

// One story per remaining Figma variant (Type × Display × Surface).
export const DefaultIconApp: Story = { args: { type: 'default', display: 'icon', surface: 'app', count: 0 }, parameters: v('Type=Default, Display=Icon, Surface=App') }
export const DefaultLabelApp: Story = { args: { type: 'default', display: 'label', surface: 'app', count: 0 }, parameters: v('Type=Default, Display=Label, Surface=App') }
export const ModifiedIconApp: Story = { args: { type: 'modified', display: 'icon', surface: 'app', count: 0 }, parameters: v('Type=Modified, Display=Icon, Surface=App') }
export const ModifiedLabelApp: Story = { args: { type: 'modified', display: 'label', surface: 'app', count: 0 }, parameters: v('Type=Modified, Display=Label, Surface=App') }
export const RemovedIconApp: Story = { args: { type: 'removed', display: 'icon', surface: 'app', count: 0 }, parameters: v('Type=Removed, Display=Icon, Surface=App') }
export const RemovedLabelApp: Story = { args: { type: 'removed', display: 'label', surface: 'app', count: 0 }, parameters: v('Type=Removed, Display=Label, Surface=App') }
export const DefaultIconLabelReport: Story = { args: { type: 'default', display: 'icon-label', surface: 'report', count: 0 }, parameters: v('Type=Default, Display=Icon + label, Surface=Report'), decorators: [(S) => <div style={{ background: 'var(--bb-a11y-report-surface-page)', padding: 12 }}><S /></div>] }
export const DefaultIconReport: Story = { args: { type: 'default', display: 'icon', surface: 'report', count: 0 }, parameters: v('Type=Default, Display=Icon, Surface=Report'), decorators: [(S) => <div style={{ background: 'var(--bb-a11y-report-surface-page)', padding: 12 }}><S /></div>] }
export const DefaultLabelReport: Story = { args: { type: 'default', display: 'label', surface: 'report', count: 0 }, parameters: v('Type=Default, Display=Label, Surface=Report'), decorators: [(S) => <div style={{ background: 'var(--bb-a11y-report-surface-page)', padding: 12 }}><S /></div>] }
export const AddedIconReport: Story = { args: { type: 'added', display: 'icon', surface: 'report', count: 0 }, parameters: v('Type=Added, Display=Icon, Surface=Report'), decorators: [(S) => <div style={{ background: 'var(--bb-a11y-report-surface-page)', padding: 12 }}><S /></div>] }
export const AddedLabelReport: Story = { args: { type: 'added', display: 'label', surface: 'report', count: 0 }, parameters: v('Type=Added, Display=Label, Surface=Report'), decorators: [(S) => <div style={{ background: 'var(--bb-a11y-report-surface-page)', padding: 12 }}><S /></div>] }
export const ModifiedIconLabelReport: Story = { args: { type: 'modified', display: 'icon-label', surface: 'report', count: 0 }, parameters: v('Type=Modified, Display=Icon + label, Surface=Report'), decorators: [(S) => <div style={{ background: 'var(--bb-a11y-report-surface-page)', padding: 12 }}><S /></div>] }
export const ModifiedIconReport: Story = { args: { type: 'modified', display: 'icon', surface: 'report', count: 0 }, parameters: v('Type=Modified, Display=Icon, Surface=Report'), decorators: [(S) => <div style={{ background: 'var(--bb-a11y-report-surface-page)', padding: 12 }}><S /></div>] }
export const ModifiedLabelReport: Story = { args: { type: 'modified', display: 'label', surface: 'report', count: 0 }, parameters: v('Type=Modified, Display=Label, Surface=Report'), decorators: [(S) => <div style={{ background: 'var(--bb-a11y-report-surface-page)', padding: 12 }}><S /></div>] }
export const RemovedIconLabelReport: Story = { args: { type: 'removed', display: 'icon-label', surface: 'report', count: 0 }, parameters: v('Type=Removed, Display=Icon + label, Surface=Report'), decorators: [(S) => <div style={{ background: 'var(--bb-a11y-report-surface-page)', padding: 12 }}><S /></div>] }
export const RemovedIconReport: Story = { args: { type: 'removed', display: 'icon', surface: 'report', count: 0 }, parameters: v('Type=Removed, Display=Icon, Surface=Report'), decorators: [(S) => <div style={{ background: 'var(--bb-a11y-report-surface-page)', padding: 12 }}><S /></div>] }
export const RemovedLabelReport: Story = { args: { type: 'removed', display: 'label', surface: 'report', count: 0 }, parameters: v('Type=Removed, Display=Label, Surface=Report'), decorators: [(S) => <div style={{ background: 'var(--bb-a11y-report-surface-page)', padding: 12 }}><S /></div>] }

const row = (display: 'icon-label' | 'icon' | 'label', surface: 'app' | 'report' = 'app') => (
  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
    <ChangeCount type="added" display={display} surface={surface} count={12} />
    <ChangeCount type="modified" display={display} surface={surface} count={5} />
    <ChangeCount type="removed" display={display} surface={surface} count={3} />
    <ChangeCount type="default" display={display} surface={surface} count={20} />
  </div>
)

export const AllDisplays: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12 }}>
      {row('icon-label')}
      {row('icon')}
      {row('label')}
      <div style={{ background: 'var(--bb-a11y-report-surface-page)', padding: 12, display: 'grid', gap: 12 }}>
        {row('icon-label', 'report')}
        {row('icon', 'report')}
      </div>
    </div>
  ),
}

export const AcrossBrands: Story = {
  render: () => (
    <BrandGrid>
      <ChangeCount type="added" count={12} />
      <ChangeCount type="modified" count={5} />
      <ChangeCount type="removed" count={3} />
    </BrandGrid>
  ),
}
