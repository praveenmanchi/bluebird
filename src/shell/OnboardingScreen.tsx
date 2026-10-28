import type { FunctionComponent, JSX } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { BrandLogo, Button, Icon } from '@shared/ui'
import type { BrandId } from '@shared/brand'
import { buildTour, stepCounter, SETTINGS_TAB, type SceneId } from './onboarding/steps'
import { usePrefersReducedMotion, useSceneLoop } from './onboarding/stage'
import type { SceneProps, TourTabChip } from './onboarding/scenes/types'
import { WelcomeScene } from './onboarding/scenes/WelcomeScene'
import { A11yScene } from './onboarding/scenes/A11yScene'
import { TokensScene } from './onboarding/scenes/TokensScene'
import { VarsearchScene } from './onboarding/scenes/VarsearchScene'
import { PublishScene } from './onboarding/scenes/PublishScene'
import { JiraScene } from './onboarding/scenes/JiraScene'
import { McpScene } from './onboarding/scenes/McpScene'
import { UxaiScene } from './onboarding/scenes/UxaiScene'
import { AgentsScene } from './onboarding/scenes/AgentsScene'
import { SetupScene } from './onboarding/scenes/SetupScene'
import './OnboardingScreen.css'

const SCENES: Readonly<Record<SceneId, FunctionComponent<SceneProps>>> = {
  welcome: WelcomeScene, a11y: A11yScene, tokens: TokensScene, varsearch: VarsearchScene, publish: PublishScene, jira: JiraScene,
  mcp: McpScene, uxai: UxaiScene, agents: AgentsScene, setup: SetupScene,
}

export interface OnboardingScreenProps {
  /** The persona's tabs; the tour explains the ones it has a scene for. */
  tabs: readonly TourTabChip[]
  brand?: BrandId
  /** `skipped` is true when the user left before the last step. */
  onFinish: (skipped: boolean) => void
  initialStep?: number
  /** Freeze the demos on their end state (stories, visual diff). Reduced motion does this too. */
  still?: boolean
}

/** Figma "Onboarding flow" (page "onboarding screens"): one screen per step, a demo in the Video frame. */
export function OnboardingScreen({ tabs, brand, onFinish, initialStep = 0, still = false }: OnboardingScreenProps) {
  const steps = buildTour(tabs)
  const [index, setIndex] = useState(() => Math.min(Math.max(0, initialStep), steps.length - 1))
  const root = useRef<HTMLElement>(null)
  const reduced = usePrefersReducedMotion()
  const frozen = still || reduced
  const step = steps[index]!
  const run = useSceneLoop(frozen, step.id)
  const last = index === steps.length - 1
  const Scene = SCENES[step.scene]

  useEffect(() => { root.current?.focus() }, [])
  // Back disables on the first step; if the focused control went away, keep focus in the tour so the keys still work.
  useEffect(() => {
    const el = root.current
    const active = document.activeElement
    const lost = !el?.contains(active) || (active instanceof HTMLButtonElement && active.disabled)
    if (el && lost) el.focus()
  }, [index])

  const go = (next: number) => setIndex(Math.min(Math.max(0, next), steps.length - 1))
  const onKeyDown = (event: JSX.TargetedKeyboardEvent<HTMLElement>) => {
    if (event.key === 'ArrowRight' && !last) { event.preventDefault(); go(index + 1) }
    else if (event.key === 'ArrowLeft' && index > 0) { event.preventDefault(); go(index - 1) }
    else if (event.key === 'Escape') { event.preventDefault(); onFinish(true) }
  }
  const stepFor = (tabId: string) => steps.findIndex((s) => s.tabId === tabId)

  return (
    <section ref={root} class="bb-onboarding" aria-label="Product tour" tabIndex={-1} onKeyDown={onKeyDown}>
      <header class="bb-onboarding__header">
        <BrandLogo brand={brand} class="bb-onboarding__logo" />
      </header>
      <div class="bb-onboarding__body">
        <nav class="bb-onboarding__tabs" aria-label="Tabs in this tour">
          {tabs.filter((t) => stepFor(t.id) >= 0).map((tab) => (
            <TourTab key={tab.id} icon={tab.icon} label={tab.label} active={step.tabId === tab.id} onClick={() => go(stepFor(tab.id))} />
          ))}
          <span class="bb-onboarding__spacer" />
          <span class="bb-onboarding__divider" aria-hidden="true" />
          <TourTab icon="api-key" label="Settings" showLabel active={step.tabId === SETTINGS_TAB} onClick={() => go(stepFor(SETTINGS_TAB))} />
        </nav>
        <div key={step.id} class="bb-onboarding__media">
          <Scene key={run} still={frozen} tabs={tabs.filter((t) => stepFor(t.id) >= 0)} />
        </div>
        <div class="bb-onboarding__copy" aria-live="polite">
          <span key={`${step.id}-count`} class="bb-onboarding__counter">{stepCounter(index, steps.length)}</span>
          <h2 key={`${step.id}-title`} class="bb-onboarding__title">{step.title}</h2>
          <p key={`${step.id}-text`} class="bb-onboarding__text">{step.body}</p>
        </div>
      </div>
      <footer class="bb-onboarding__footer">
        <div class="bb-onboarding__dots">
          {steps.map((s, k) => (
            <button key={s.id} type="button" class={`bb-onboarding__dot${k === index ? ' is-active' : ''}`}
              aria-label={`Step ${k + 1} of ${steps.length}: ${s.title}`} aria-current={k === index ? 'step' : undefined} onClick={() => go(k)} />
          ))}
        </div>
        <div class="bb-onboarding__nav">
          <Button variant="secondary" onClick={() => onFinish(true)}>Skip</Button>
          <Button variant="secondary" disabled={index === 0} onClick={() => go(index - 1)}>Back</Button>
          {/* Alternating class names restart the pulse each step without remounting (and unfocusing) the button. */}
          <Button class={`bb-onboarding__next bb-onboarding__next--${index % 2 ? 'odd' : 'even'}`} onClick={() => (last ? onFinish(false) : go(index + 1))}>
            {last ? 'Get started' : 'Next'}
          </Button>
        </div>
      </footer>
    </section>
  )
}

interface TourTabProps { icon: TourTabChip['icon']; label: string; active: boolean; showLabel?: boolean; onClick: () => void }

function TourTab({ icon, label, active, showLabel = false, onClick }: TourTabProps) {
  return (
    <button type="button" class={`bb-onboarding__tab${active ? ' is-active' : ''}`} aria-current={active ? 'step' : undefined} aria-label={label} title={label} onClick={onClick}>
      <Icon name={icon} size="sm" />
      {(active || showLabel) && <span class="bb-onboarding__tab-label">{label}</span>}
      {active && <span class="bb-onboarding__indicator" aria-hidden="true" />}
    </button>
  )
}
