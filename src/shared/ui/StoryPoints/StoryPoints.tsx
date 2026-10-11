import type { ComponentChildren, JSX } from 'preact'
import './StoryPoints.css'

export interface StoryPointsProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  /** Figma "Points" — the estimate. */
  children?: ComponentChildren
}

/** Figma "Story Points" (40000265:8036): the story-point estimate chip. */
export function StoryPoints({ children = '5', class: cls, ...rest }: StoryPointsProps) {
  return (
    <span {...rest} class={`bb-story-points ${cls ?? ''}`}>
      <span class="bb-story-points__value">{children}</span>
    </span>
  )
}
