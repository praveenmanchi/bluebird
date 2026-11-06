import type { Meta, StoryObj } from '@storybook/preact-vite'
import { personas } from '@shared/config'
import { ICONS, type IconName } from '@shared/ui'
import { OnboardingScreen, type OnboardingScreenProps } from './OnboardingScreen'
import { figma } from './OnboardingScreen.figma'
import { buildTour } from './onboarding/steps'
import type { TourTabChip } from './onboarding/scenes/types'
import { BrandGrid } from '../../.storybook/helpers'

const frame = { width: '500px', height: '760px', display: 'flex', flexDirection: 'column' as const }
const isIcon = (name: string): name is IconName => name in ICONS
const tabsOf = (personaId: string): TourTabChip[] =>
  (personas.find((p) => p.id === personaId)?.tabs ?? []).map((t) => ({ id: t.id, label: t.label, icon: isIcon(t.icon) ? t.icon : 'variables' }))

const designer = tabsOf('ui-designer')
const system = tabsOf('design-system')
const stepIndex = (tabs: readonly TourTabChip[], id: string) => Math.max(0, buildTour(tabs).findIndex((s) => s.id === id))

const screen = (props: Partial<OnboardingScreenProps> = {}) => () => (
  <div style={frame}><OnboardingScreen tabs={designer} onFinish={() => undefined} {...props} /></div>
)

const meta = { title: 'Screens/Onboarding', parameters: { figma: { setId: figma.setId, name: figma.name } } } satisfies Meta
export default meta
type Story = StoryObj

/** Figma "Onboarding · 2 · Accessibility" — frozen on the demo's end state for the visual diff. */
export const Accessibility: Story = {
  parameters: { figma: { variant: 'Onboarding · 2 · Accessibility' } },
  render: screen({ initialStep: stepIndex(designer, 'a11y'), still: true }),
}

/** The whole tour, animated — use ← / → or the buttons. */
export const Playing: Story = { render: screen() }

export const Welcome: Story = { render: screen({ still: true }) }
export const Jira: Story = { render: screen({ initialStep: stepIndex(designer, 'jira'), still: true }) }
export const McpHandoff: Story = { render: screen({ initialStep: stepIndex(designer, 'mcp'), still: true }) }
export const UxAi: Story = { render: screen({ initialStep: stepIndex(designer, 'uxai'), still: true }) }
export const AiAgents: Story = { render: screen({ initialStep: stepIndex(designer, 'agents'), still: true }) }
export const Setup: Story = { render: screen({ initialStep: buildTour(designer).length - 1, still: true }) }

/** Design System persona: Audit comes first, Jira and MCP aren’t in its tour. */
export const Audit: Story = { render: screen({ tabs: system, initialStep: stepIndex(system, 'audit'), still: true }) }

/** Window size S (360 × 480): the demo scales down to fit. */
export const SmallWindow: Story = {
  render: () => <div style={{ ...frame, width: '360px', height: '480px' }}><OnboardingScreen tabs={designer} initialStep={stepIndex(designer, 'a11y')} onFinish={() => undefined} /></div>,
}

/** Every brand, Accessibility step. */
export const Brands: Story = {
  render: () => <BrandGrid width="500px"><div style={frame}><OnboardingScreen tabs={designer} initialStep={stepIndex(designer, 'a11y')} still onFinish={() => undefined} /></div></BrandGrid>,
}
