import type { Meta, StoryObj } from '@storybook/preact-vite'
import { DisabilityIndicator, DISABILITY_KINDS } from './DisabilityIndicator'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Atoms/DisabilityIndicator',
  component: DisabilityIndicator,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: { kind: { control: 'select', options: [...DISABILITY_KINDS] } },
  args: { kind: 'auditory' },
} satisfies Meta<typeof DisabilityIndicator>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const Auditory: Story = { parameters: v('Property 1=Auditory') }
export const Code: Story = { args: { kind: 'code' }, parameters: v('Property 1=Code') }
export const Cognitive: Story = { args: { kind: 'cognitive' }, parameters: v('Property 1=Cognitive') }
export const Content: Story = { args: { kind: 'content' }, parameters: v('Property 1=Content') }
export const Design: Story = { args: { kind: 'design' }, parameters: v('Property 1=Design') }
export const Physical: Story = { args: { kind: 'physical' }, parameters: v('Property 1=Physical') }
export const Visual: Story = { args: { kind: 'visual' }, parameters: v('Property 1=Visual') }

export const AllKinds: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--bb-space-inline-sm)' }}>
      {DISABILITY_KINDS.map((kind) => <DisabilityIndicator key={kind} kind={kind} />)}
    </div>
  ),
}

export const AcrossBrands: Story = {
  render: () => (
    <BrandGrid>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--bb-space-inline-sm)' }}>
        {DISABILITY_KINDS.map((kind) => <DisabilityIndicator key={kind} kind={kind} />)}
      </div>
    </BrandGrid>
  ),
}
