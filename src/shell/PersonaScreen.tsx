import type { JSX } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { BrandLogo, Button, ICONS, Icon, type IconName } from '@shared/ui'
import type { BrandId } from '@shared/brand'
import type { ResolvedPersona, ResolvedTab } from '@shared/config'
import { usePrefersReducedMotion } from './onboarding/stage'
import { Bird } from './persona/Bird'
import { personaCopy } from './persona/copy'
import './PersonaScreen.css'

/** Curtain plus the birds landing one by one. */
const INTRO_MS = 1500
/** The other birds flying back and landing after Change persona. */
const RETURN_MS = 1100
const NAV_KEYS = ['Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']
const CLOUD = 'M16 40a14 14 0 0 1 2-28 20 20 0 0 1 38-4 16 16 0 0 1 26 12 12 12 0 0 1 2 20z'

export interface PersonaScreenProps {
  personas: readonly ResolvedPersona[]
  brand?: BrandId
  /** Pre-selected bird (the current persona, when opened from Settings). */
  initialId?: string | null
  onConfirm: (id: string) => void
  /** Present when there is somewhere to go back to (Settings). */
  onCancel?: () => void
  /** Plays the curtain and the birds landing; off when coming from Settings. */
  intro?: boolean
  /** No animation (stories, visual diff). Reduced motion does this too. */
  still?: boolean
  /** Laid over the next screen (see PersonaHandOver): the picker fades away as the picked bird lifts off towards the viewer. */
  departing?: boolean
}

type Vars = JSX.CSSProperties & Record<`--${string}`, string | number>

/**
 * The birds on a branch. Pick one and the others fly away while it moves to the centre, in front of a
 * full circle, and its speech bubble lists that persona's tabs. Change persona brings the flock back.
 */
export function PersonaScreen({ personas, brand, initialId = null, onConfirm, onCancel, intro = true, still = false, departing = false }: PersonaScreenProps) {
  const [selectedId, setSelectedId] = useState<string | null>(personas.some((p) => p.id === initialId) ? initialId : null)
  const [leaving, setLeaving] = useState(false)
  // Gated in state so the landing plays once: as a plain class it would replay on every bird that loses the selection.
  const [introing, setIntroing] = useState(intro && !departing)
  const [returning, setReturning] = useState(false)
  /** Opened on a persona (from Settings): the others are simply gone, nothing to watch fly away. */
  const [instant, setInstant] = useState(selectedId !== null && !departing)
  /**
   * Set once someone navigates here by keyboard. Focus lands on a bird when the screen opens, and after
   * typing the access code the browser would ring it as :focus-visible, though nobody moved to it.
   */
  const [usingKeyboard, setUsingKeyboard] = useState(false)
  /** The bird keyboard focus sits on while none is picked. */
  const [rover, setRover] = useState(0)
  /** Last picked bird: the others fly away from it and back past it. */
  const [anchor, setAnchor] = useState(0)
  const reduced = usePrefersReducedMotion()
  const frozen = still || reduced
  const root = useRef<HTMLElement>(null)
  const radios = useRef<(HTMLButtonElement | null)[]>([])
  const selectedIndex = personas.findIndex((p) => p.id === selectedId)
  const selected = personas[selectedIndex] ?? null

  // Follow the flow: Continue once a bird is picked, the birds otherwise (the previous screen took focus with it).
  useEffect(() => {
    if (selectedId) root.current?.querySelector<HTMLElement>('.bb-pick__continue')?.focus()
    else radios.current[rover]?.focus()
  }, [selectedId])
  useEffect(() => {
    if (!introing) return
    const timer = setTimeout(() => { setIntroing(false) }, INTRO_MS)
    return () => clearTimeout(timer)
  }, [introing])
  useEffect(() => {
    if (!returning) return
    const timer = setTimeout(() => { setReturning(false) }, RETURN_MS)
    return () => clearTimeout(timer)
  }, [returning])

  const confirmed = useRef(onConfirm)
  confirmed.current = onConfirm
  useEffect(() => {
    if (!leaving || !selectedId) return
    // No wait here: the bird starts flapping, and its flight plays over the next screen (PersonaHandOver).
    const timer = setTimeout(() => { confirmed.current(selectedId) }, 0)
    return () => clearTimeout(timer)
  }, [leaving, selectedId])

  const pick = (index: number) => {
    setIntroing(false)
    setReturning(false)
    setInstant(false)
    setAnchor(index)
    setSelectedId(personas[index]!.id)
  }
  const changePersona = () => {
    setAnchor(selectedIndex)
    setRover(selectedIndex)
    setInstant(false)
    setReturning(true)
    setSelectedId(null)
  }
  // Arrows only move focus: picking sends the other birds away, so it takes a deliberate click, Enter or Space.
  const move = (from: number, step: number) => {
    const next = (from + step + personas.length) % personas.length
    setRover(next)
    radios.current[next]?.focus()
  }
  const onKeyDown = (event: JSX.TargetedKeyboardEvent<HTMLElement>, index: number) => {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0
    if (step === 0) return
    event.preventDefault()
    move(index, step)
  }

  const rootClass = ['bb-pick', frozen && 'is-still', introing && 'has-intro', leaving && 'is-leaving', selected && 'has-selection', returning && 'is-returning', instant && 'is-instant', departing && 'is-departing', usingKeyboard && 'uses-keyboard'].filter(Boolean).join(' ')
  return (
    <section ref={root} class={rootClass} style={{ '--pp-n': personas.length } as Vars} aria-label="Choose your persona"
      onKeyDown={(e) => { if (NAV_KEYS.includes(e.key)) setUsingKeyboard(true) }} onPointerDown={() => setUsingKeyboard(false)}>
      {intro && !departing && <div class="bb-pick__curtain" aria-hidden="true" />}
      <header class="bb-pick__header">
        <BrandLogo brand={brand} class="bb-pick__logo" />
      </header>
      <div class="bb-pick__stage">
        <svg class="bb-pick__sky" aria-hidden="true" viewBox="0 0 480 300" preserveAspectRatio="xMidYMid slice">
          <g transform="translate(18 96)"><path class="bb-pick__cloud" d={CLOUD} /></g>
          <g transform="translate(330 44) scale(1.3)"><path class="bb-pick__cloud bb-pick__cloud--2" d={CLOUD} /></g>
          <g transform="translate(250 150) scale(.8)"><path class="bb-pick__cloud bb-pick__cloud--3" d={CLOUD} /></g>
        </svg>
        <div class="bb-pick__heading">
          <h1 id="bb-pick-title" class="bb-pick__title">Who’s joining the flock?</h1>
          <p class="bb-pick__subtitle">Pick your bird and we’ll set up the tools you need.</p>
        </div>
        <div class="bb-pick__birds" role="radiogroup" aria-labelledby="bb-pick-title">
          <span class="bb-pick__sun" aria-hidden="true" />
          <svg class="bb-pick__branch" viewBox="0 0 500 30" preserveAspectRatio="none" aria-hidden="true">
            <path class="bb-pick__bough" pathLength={1} d="M-10 12C120 22 300 2 510 14" />
          </svg>
          {personas.map((persona, i) => {
            const isSelected = persona.id === selectedId
            const flying = !isSelected && i !== anchor && (selectedIndex >= 0 || returning)
            return (
              <button key={persona.id} ref={(el) => { radios.current[i] = el }} type="button" role="radio" aria-checked={isSelected}
                tabIndex={i === (selectedIndex >= 0 ? selectedIndex : rover) ? 0 : -1}
                class={`bb-pick__bird${isSelected ? ' is-selected' : ''}${i === anchor ? ' is-anchor' : ''}`}
                style={{ gridColumn: i + 1, '--pp-i': i, '--pp-dir': i < anchor ? -1 : 1, '--pp-blink': `${i * 0.9}s` } as Vars}
                disabled={leaving || departing || (selected !== null && !isSelected)} onClick={() => pick(i)} onKeyDown={(e) => onKeyDown(e, i)}>
                <span class="bb-pick__figure">
                  <Bird kind={personaCopy(persona.id).kind} class={isSelected ? (departing ? 'is-flapping' : `is-playing${leaving ? ' is-flapping' : ''}`) : flying ? 'is-flapping' : undefined} />
                </span>
                <span class="bb-pick__label">{persona.label}</span>
              </button>
            )
          })}
        </div>
      </div>
      <div class="bb-pick__panel">
        <span class="bb-pick__tail-track" aria-hidden="true"><span class="bb-pick__tail" /></span>
        <div class="bb-pick__bubble" aria-live="polite">
          {selected ? <PersonaDetails key={selected.id} persona={selected} /> : <p class="bb-pick__hint">Tap a bird to say hello</p>}
        </div>
        <footer class="bb-pick__footer">
          {selected
            ? <Button variant="secondary" disabled={leaving} onClick={changePersona}>Change persona</Button>
            : onCancel && <Button variant="secondary" onClick={onCancel}>Back</Button>}
          <Button class="bb-pick__continue" disabled={!selected || leaving} onClick={() => setLeaving(true)}>
            {selected ? `Continue as ${selected.label}` : 'Continue'}
          </Button>
        </footer>
      </div>
    </section>
  )
}

function PersonaDetails({ persona }: { persona: ResolvedPersona }) {
  const { quip, blurb } = personaCopy(persona.id)
  return (
    <>
      <p class="bb-pick__quip">“{quip}”</p>
      <p class="bb-pick__blurb">{blurb}</p>
      <ul class="bb-pick__tools" aria-label={`${persona.label} tabs`}>
        {persona.tabs.map((tab, i) => <ToolChip key={tab.id} tab={tab} index={i} />)}
      </ul>
    </>
  )
}

function ToolChip({ tab, index }: { tab: ResolvedTab; index: number }) {
  const icon: IconName = tab.icon in ICONS ? (tab.icon as IconName) : 'variables'
  return (
    <li class="bb-pick__tool" style={{ '--pp-i': index } as Vars}>
      <Icon name={icon} size="sm" />
      {tab.label}
    </li>
  )
}
