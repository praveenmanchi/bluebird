import type { Meta, StoryObj } from '@storybook/preact-vite'
import { useState } from 'preact/hooks'
import { ChangelogNote } from './ChangelogNote'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

/** The Publish tab paints these on its panel surface. */
const panel = { background: 'var(--bb-publish-surface-panel)', padding: 'var(--bb-publish-space-panel)' }

const meta = {
  title: 'Molecules/ChangelogNote',
  component: ChangelogNote,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  decorators: [(Story) => <div style={panel}><Story /></div>],
  argTypes: {
    state: { control: 'inline-radio', options: ['auto', 'edited'] },
    change: { control: 'inline-radio', options: ['added', 'modified', 'removed', 'deprecated'] },
    onAction: { action: 'action' },
    onNoteInput: { action: 'note' },
  },
  args: { state: 'auto', change: 'modified', editing: false },
} satisfies Meta<typeof ChangelogNote>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const Auto: Story = { parameters: v('State=Auto') }
export const Edited: Story = { args: { state: 'edited' }, parameters: v('State=Edited') }
export const Editing: Story = { args: { state: 'edited', editing: true } }

/** Edit → type → Done, the way the Publish review step drives it. */
export const Interactive: Story = {
  render: () => {
    const [editing, setEditing] = useState(false)
    const [edited, setEdited] = useState(false)
    const [note, setNote] = useState('Primary button background darkened from #0C8CE9 to #0560A3 so white labels pass AA (4.9:1).')
    return (
      <ChangelogNote
        state={edited ? 'edited' : 'auto'}
        editing={editing}
        note={note}
        onNoteInput={(next) => { setNote(next); setEdited(true) }}
        onAction={() => setEditing((e) => !e)}
      />
    )
  },
}

export const AcrossBrands: Story = {
  decorators: [],
  render: () => (
    <BrandGrid width="400px">
      <div style={{ ...panel, display: 'flex', flexDirection: 'column', gap: 'var(--bb-publish-space-inline)' }}>
        <ChangelogNote change="added" title="button/bg/tertiary" note="New tertiary button background for low-emphasis actions." />
        <ChangelogNote state="edited" change="deprecated" title="color/legacy/blue" note="Use color/accent/default instead; removed in v3." />
      </div>
    </BrandGrid>
  ),
}
