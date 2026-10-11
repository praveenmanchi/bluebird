import type { JSX } from 'preact'
import './Spinner.css'

export type SpinnerTone = 'on-accent' | 'accent'
export type SpinnerSize = 'sm' | 'lg'

export interface SpinnerProps extends Omit<JSX.SVGAttributes<SVGSVGElement>, 'size'> {
  /** Figma "Tone": On accent (inside a primary button) / Accent (on a surface). */
  tone?: SpinnerTone
  /** login/spinner/size (16) or login/spinner/size-lg (40, the SSO redirect). Not a Figma variant. */
  size?: SpinnerSize
  /** Accessible name. Omit when visible text already says what is loading. */
  label?: string
}

/**
 * Figma "Spinner" (40000321:8410): an indeterminate ring. Geometry is the set's
 * ellipse arcData in a 16-unit box — innerRadius 0.75 (a 2-unit ring at r 7) and
 * an arc from -90° to +30° (a third of the ring).
 */
export function Spinner({ tone = 'on-accent', size = 'sm', label, class: cls, ...rest }: SpinnerProps) {
  return (
    <svg
      {...rest}
      class={`bb-spinner ${cls ?? ''}`}
      data-tone={tone}
      data-size={size}
      viewBox="0 0 16 16"
      fill="none"
      role={label ? 'img' : 'presentation'}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
    >
      <circle class="bb-spinner__track" cx="8" cy="8" r="7" stroke-width="2" />
      <circle class="bb-spinner__arc" cx="8" cy="8" r="7" stroke-width="2" pathLength={360} stroke-dasharray="120 360" transform="rotate(-90 8 8)" />
    </svg>
  )
}
