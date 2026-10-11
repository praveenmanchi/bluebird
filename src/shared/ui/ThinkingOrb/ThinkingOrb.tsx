import type { JSX } from 'preact'
import './ThinkingOrb.css'

export type ThinkingOrbState = 'searching' | 'composing' | 'breathing'
export type ThinkingOrbSize = '20' | '40'
type BlobTone = 'core' | 'a' | 'b' | 'c'

/** The blurred ellipses each Figma variant stacks (bottom → top), by uxai/orb/* colour.
 *  The highlight (uxai/text/title at 35%) always sits on top and is rendered separately. */
const BLOBS: Record<ThinkingOrbState, readonly BlobTone[]> = {
  searching: ['core', 'a', 'b'],
  composing: ['a', 'c', 'core'],
  breathing: ['core', 'a'],
}

export interface ThinkingOrbProps extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, 'size'> {
  /** Figma "State": Searching (reading sources) / Composing (writing the answer) / Breathing (idle, at rest). */
  state?: ThinkingOrbState
  /** Figma "Size": 20 = inline, 40 = avatar. */
  size?: ThinkingOrbSize
  /** Accessible name. Omit when the orb is decorative (e.g. beside an assistant message). */
  label?: string
}

/** Figma "Thinking Orb" (40000283:8191): the UX AI activity indicator — layered blurred
 *  ellipses that animate per state (CSS keyframes, off under prefers-reduced-motion). */
export function ThinkingOrb({ state = 'searching', size = '20', label, class: cls, ...rest }: ThinkingOrbProps) {
  return (
    <span
      {...rest}
      class={`bb-thinking-orb ${cls ?? ''}`}
      data-state={state}
      data-size={size}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
    >
      <span class="bb-thinking-orb__field">
        {BLOBS[state].map((tone) => <span key={tone} class="bb-thinking-orb__blob" data-tone={tone} />)}
      </span>
      <span class="bb-thinking-orb__highlight" />
    </span>
  )
}
