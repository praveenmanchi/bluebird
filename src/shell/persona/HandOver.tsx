import { useEffect, useRef } from 'preact/hooks'
import type { BrandId } from '@shared/brand'
import type { ResolvedPersona } from '@shared/config'
import { usePrefersReducedMotion } from '../onboarding/stage'
import { PersonaScreen } from '../PersonaScreen'

/** The bird's lift-off and the picker fading out over the next screen. Matches bb-pick-take-off. */
export const HAND_OVER_MS = 700

export interface PersonaHandOverProps {
  personas: readonly ResolvedPersona[]
  brand?: BrandId
  /** The persona that was just picked. */
  personaId: string
  onDone: () => void
}

const noop = () => undefined

/**
 * Continue's animation. The next screen opens straight away and this lays the picker back over it: the
 * picker fades as the picked bird lifts off towards the viewer and fades too, so the two screens cross over
 * in one smooth move. Decoration only: hidden from assistive tech and out of reach of the pointer and keyboard.
 */
export function PersonaHandOver({ personas, brand, personaId, onDone }: PersonaHandOverProps) {
  const reduced = usePrefersReducedMotion()
  const show = !reduced && personas.some((p) => p.id === personaId)
  const done = useRef(onDone)
  done.current = onDone
  useEffect(() => {
    const timer = setTimeout(() => { done.current() }, show ? HAND_OVER_MS : 0)
    return () => clearTimeout(timer)
  }, [show])
  if (!show) return null
  return (
    <div class="bb-pick-handover" aria-hidden="true" inert>
      <PersonaScreen personas={personas} brand={brand} initialId={personaId} intro={false} departing onConfirm={noop} />
    </div>
  )
}
