import type { JSX } from 'preact'
import './Rating.css'

export type RatingLevel = 'A' | 'AA' | 'AAA'

export interface RatingProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  /** Figma "Rating": A / AA / AAA (WCAG conformance level). */
  rating?: RatingLevel
}

/** Figma "Rating" (419:40175): a WCAG conformance level chip (A / AA / AAA). */
export function Rating({ rating = 'A', class: cls, ...rest }: RatingProps) {
  return (
    <span {...rest} class={`bb-rating ${cls ?? ''}`} data-rating={rating} title={rest.title ?? `WCAG level ${rating}`}>
      <span class="bb-rating__label">{rating}</span>
    </span>
  )
}
