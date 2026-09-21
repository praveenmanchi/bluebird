import type { JSX } from 'preact'
import { Icon, type IconName } from '../Icon/Icon'
import './DisabilityIndicator.css'

export type DisabilityKind = 'auditory' | 'code' | 'cognitive' | 'content' | 'design' | 'physical' | 'visual'

export const DISABILITY_KINDS: readonly DisabilityKind[] = ['auditory', 'code', 'cognitive', 'content', 'design', 'physical', 'visual']

const LABEL: Record<DisabilityKind, string> = {
  auditory: 'Auditory',
  code: 'Code',
  cognitive: 'Cognitive',
  content: 'Content',
  design: 'Design',
  physical: 'Physical',
  visual: 'Visual',
}

export interface DisabilityIndicatorProps extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, 'label'> {
  /** Figma "Property 1": Auditory / Code / Cognitive / Content / Design / Physical / Visual. */
  kind?: DisabilityKind
  /** Accessible name; defaults to the variant name. */
  label?: string
}

/** Figma "Disability Indicator" (419:40527): a small bordered square tile holding a disability-<kind> glyph. */
export function DisabilityIndicator({ kind = 'auditory', label, class: cls, ...rest }: DisabilityIndicatorProps) {
  return (
    <span {...rest} class={`bb-disability-indicator ${cls ?? ''}`} data-kind={kind}>
      <Icon name={`disability-${kind}` as IconName} class="bb-disability-indicator__icon" title={label ?? LABEL[kind]} />
    </span>
  )
}
