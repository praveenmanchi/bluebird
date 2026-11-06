import type { JSX } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { BrandLogo } from '@shared/ui'
import type { BrandId } from '@shared/brand'
import { usePrefersReducedMotion } from './onboarding/stage'
import './SplashScreen.css'

/** How long the logo holds before the persona screen. */
export const SPLASH_MS = 2000
/** Reduced motion: no fade to wait for, just long enough to read the logo. */
export const SPLASH_STILL_MS = 900
/** The logo fades out before the next screen takes over. */
const LEAVE_MS = 240

export interface SplashScreenProps {
  brand?: BrandId
  onDone: () => void
  /** Hold on the logo and never advance (stories, visual diff). */
  still?: boolean
}

/** First-run intro: the signed-in brand's logo, centred on the brand colour. Any click or fresh key press skips it; Enter still held from the login form doesn't. */
export function SplashScreen({ brand, onDone, still = false }: SplashScreenProps) {
  const reduced = usePrefersReducedMotion()
  const [leaving, setLeaving] = useState(false)
  const root = useRef<HTMLElement>(null)
  const done = useRef(onDone)
  done.current = onDone

  useEffect(() => { root.current?.focus() }, [])
  useEffect(() => {
    if (still) return
    const timer = setTimeout(() => { setLeaving(true) }, reduced ? SPLASH_STILL_MS : SPLASH_MS)
    return () => clearTimeout(timer)
  }, [still, reduced])
  useEffect(() => {
    if (!leaving) return
    const timer = setTimeout(() => { done.current() }, reduced ? 0 : LEAVE_MS)
    return () => clearTimeout(timer)
  }, [leaving, reduced])

  const skip = () => { if (!still) setLeaving(true) }
  const onKeyDown = (event: JSX.TargetedKeyboardEvent<HTMLElement>) => { if (event.key !== 'Tab' && !event.repeat) skip() }

  return (
    <section ref={root} class={`bb-splash${leaving ? ' is-leaving' : ''}${still ? ' is-still' : ''}`} aria-label="Loading" tabIndex={-1} onClick={skip} onKeyDown={onKeyDown}>
      <BrandLogo brand={brand} class="bb-splash__logo" />
    </section>
  )
}
