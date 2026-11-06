import type { Meta, StoryObj } from '@storybook/preact-vite'
import { BotAvatar, BOT_AGENTS, BOT_STATES } from './BotAvatar'
import { figma } from './figma'
import { BrandGrid, VariantGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Atoms/BotAvatar',
  component: BotAvatar,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: {
    agent: { control: 'select', options: [...BOT_AGENTS] },
    state: { control: 'inline-radio', options: [...BOT_STATES] },
  },
  args: { agent: 'accessibility', state: 'default' },
} satisfies Meta<typeof BotAvatar>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const AccessibilityDefault: Story = { args: { agent: 'accessibility', state: 'default' }, parameters: v('Agent=Accessibility, State=Default') }
export const AccessibilityWorking: Story = { args: { agent: 'accessibility', state: 'working' }, parameters: v('Agent=Accessibility, State=Working') }
export const AccessibilitySleeping: Story = { args: { agent: 'accessibility', state: 'sleeping' }, parameters: v('Agent=Accessibility, State=Sleeping') }
export const ContentDefault: Story = { args: { agent: 'content', state: 'default' }, parameters: v('Agent=Content, State=Default') }
export const ContentWorking: Story = { args: { agent: 'content', state: 'working' }, parameters: v('Agent=Content, State=Working') }
export const ContentSleeping: Story = { args: { agent: 'content', state: 'sleeping' }, parameters: v('Agent=Content, State=Sleeping') }
export const WritingDefault: Story = { args: { agent: 'writing', state: 'default' }, parameters: v('Agent=Writing, State=Default') }
export const WritingWorking: Story = { args: { agent: 'writing', state: 'working' }, parameters: v('Agent=Writing, State=Working') }
export const WritingSleeping: Story = { args: { agent: 'writing', state: 'sleeping' }, parameters: v('Agent=Writing, State=Sleeping') }
export const SpellingDefault: Story = { args: { agent: 'spelling', state: 'default' }, parameters: v('Agent=Spelling, State=Default') }
export const SpellingWorking: Story = { args: { agent: 'spelling', state: 'working' }, parameters: v('Agent=Spelling, State=Working') }
export const SpellingSleeping: Story = { args: { agent: 'spelling', state: 'sleeping' }, parameters: v('Agent=Spelling, State=Sleeping') }
export const DesignSystemDefault: Story = { args: { agent: 'design-system', state: 'default' }, parameters: v('Agent=Design System, State=Default') }
export const DesignSystemWorking: Story = { args: { agent: 'design-system', state: 'working' }, parameters: v('Agent=Design System, State=Working') }
export const DesignSystemSleeping: Story = { args: { agent: 'design-system', state: 'sleeping' }, parameters: v('Agent=Design System, State=Sleeping') }
export const LocalizationDefault: Story = { args: { agent: 'localization', state: 'default' }, parameters: v('Agent=Localization, State=Default') }
export const LocalizationWorking: Story = { args: { agent: 'localization', state: 'working' }, parameters: v('Agent=Localization, State=Working') }
export const LocalizationSleeping: Story = { args: { agent: 'localization', state: 'sleeping' }, parameters: v('Agent=Localization, State=Sleeping') }

export const Matrix: Story = {
  render: () => (
    <VariantGrid rows={[...BOT_AGENTS]} columns={[...BOT_STATES]}>
      {(agent, state) => <BotAvatar agent={agent as (typeof BOT_AGENTS)[number]} state={state as (typeof BOT_STATES)[number]} />}
    </VariantGrid>
  ),
}

export const AcrossBrands: Story = {
  render: () => (
    <BrandGrid width='320px'>
      <div style={{ display: 'flex', gap: 'var(--bb-agents-space-inline)' }}>
        {BOT_AGENTS.map((agent) => <BotAvatar key={agent} agent={agent} />)}
      </div>
    </BrandGrid>
  ),
}
