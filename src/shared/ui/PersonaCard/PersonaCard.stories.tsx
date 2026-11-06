import type { Meta, StoryObj } from '@storybook/preact-vite'
import { PersonaCard } from './PersonaCard'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'
import userpic from '../../../../figma/assets/persona-userpic-05.png'

const DESCRIPTION = 'Your persona sets which tabs you see. Change it any time and the tour replays for your new tabs.'
const FOOTNOTE = 'Switching teams will replay the onboarding tour for your new role.'

const meta = {
  title: 'Organisms/PersonaCard',
  component: PersonaCard,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: { name: 'Design System', description: DESCRIPTION, footnote: FOOTNOTE, actionLabel: 'Change the persona', image: userpic },
} satisfies Meta<typeof PersonaCard>
export default meta
type Story = StoryObj<typeof meta>

/** The single Figma variant (Team Name + Team Description). */
export const Default: Story = { parameters: { figma: { variant: 'Frame 1430102664' } } }

export const UxTeam: Story = {
  args: {
    name: 'UX',
    description: 'UX sees accessibility audits, mockup generation, variable mapping and Jira workflow.',
    tabs: [
      { label: 'Accessibility', icon: 'accessibility' },
      { label: 'UXAI as assister', icon: 'uxai' },
      { label: 'Inspect', icon: 'inspect' },
    ],
  },
}

export const NoTabs: Story = { args: { tabs: [] } }

export const AcrossBrands: Story = {
  render: (args) => (
    <BrandGrid width="820px">
      <PersonaCard {...args} />
    </BrandGrid>
  ),
}
