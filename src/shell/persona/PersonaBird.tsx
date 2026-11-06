import type { JSX } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { Bird } from './Bird'
import { personaCopy } from './copy'
import './PersonaBird.css'

/** Out of the frame and back in again; matches bb-persona-bird-fly. */
export const FLIGHT_MS = 1500
/** How long the bird keeps its line up after landing. */
export const SAY_MS = 2600

export interface PersonaBirdProps {
  personaId: string
  label: string
}

type Vars = JSX.CSSProperties & Record<`--${string}`, string | number>

/**
 * The persona picker's bird in a square frame. It plays the whole sequence on
 * arrival and on every press: flies off into the distance, comes back, lands,
 * plays its prop and says its line. In between it blinks and watches the pointer.
 */
export function PersonaBird({ personaId, label }: PersonaBirdProps) {
  const { kind, quip } = personaCopy(personaId)
  const [look, setLook] = useState(0)
  const [flights, setFlights] = useState(0)
  /** Bumped on landing: a new key replays the prop's one-shot animations. */
  const [landings, setLandings] = useState(0)
  const [flying, setFlying] = useState(true)
  const [saying, setSaying] = useState(false)

  useEffect(() => {
    setFlying(true)
    setSaying(false)
    const land = setTimeout(() => {
      setFlying(false)
      setLandings((n) => n + 1)
      setSaying(true)
    }, FLIGHT_MS)
    const quiet = setTimeout(() => setSaying(false), FLIGHT_MS + SAY_MS)
    return () => { clearTimeout(land); clearTimeout(quiet) }
  }, [flights])

  const onMouseMove = (event: JSX.TargetedMouseEvent<HTMLButtonElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    setLook(Math.max(-1, Math.min(1, ((event.clientX - box.left) / box.width - 0.5) * 2)))
  }

  return (
    <div class={`bb-persona-bird${flying ? ' is-flying' : ''}`} style={{ '--pp-look': look } as Vars}>
      <button type="button" class="bb-persona-bird__frame" aria-label={`${label} bird: fly`}
        onClick={() => { if (!flying) setFlights((n) => n + 1) }} onMouseMove={onMouseMove} onMouseLeave={() => setLook(0)}>
        <span class="bb-persona-bird__figure">
          <Bird key={landings} kind={kind} class={`is-playing${flying ? ' is-flapping' : ''}`} />
        </span>
      </button>
      <span class="bb-persona-bird__say" aria-live="polite">{saying && <span class="bb-persona-bird__bubble">“{quip}”</span>}</span>
    </div>
  )
}
