import type { JSX } from 'preact'
import './PriorityIcon.css'

export type Priority = 'highest' | 'high' | 'medium' | 'low' | 'lowest'

interface Glyph {
  /** The Figma "Vector" layer's bounding box in the 16×16 frame, so the derived tokens size the SVG. */
  viewBox: string
  d: string
}

/** Chevron geometry copied from the Figma "Priority Icon" set (40000265:8035); colour comes from CSS. */
const GLYPHS: Record<Priority, Glyph> = {
  highest: { viewBox: '4 4 8 8', d: 'M4 8L8 4L12 8M4 12L8 8L12 12' },
  high: { viewBox: '4 6 8 4', d: 'M4 10L8 6L12 10' },
  medium: { viewBox: '4 6.5 8 3', d: 'M4 6.5H12M4 9.5H12' },
  low: { viewBox: '4 6 8 4', d: 'M4 6L8 10L12 6' },
  lowest: { viewBox: '4 4 8 8', d: 'M4 4L8 8L12 4M4 8L8 12L12 8' },
}

const LABEL: Record<Priority, string> = {
  highest: 'Highest priority',
  high: 'High priority',
  medium: 'Medium priority',
  low: 'Low priority',
  lowest: 'Lowest priority',
}

export interface PriorityIconProps extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, 'label'> {
  /** Figma "Priority": Highest / High / Medium / Low / Lowest. */
  priority?: Priority
  /** Accessible name; defaults to "<Priority> priority". */
  label?: string
}

/** Figma "Priority Icon" (40000265:8035): the Jira priority chevrons. */
export function PriorityIcon({ priority = 'highest', label, class: cls, ...rest }: PriorityIconProps) {
  const glyph = GLYPHS[priority]
  return (
    <span {...rest} class={`bb-priority-icon ${cls ?? ''}`} data-priority={priority} role="img" aria-label={label ?? LABEL[priority]}>
      <svg class="bb-priority-icon__glyph" viewBox={glyph.viewBox} aria-hidden="true">
        <path d={glyph.d} />
      </svg>
    </span>
  )
}
