import type { ComponentChildren, JSX } from 'preact'
import { Icon, type IconName } from '../Icon/Icon'
import './PrincipleTag.css'

export type Principle = 'perceivable' | 'operable' | 'understandable' | 'robust'

export const PRINCIPLES: readonly Principle[] = ['perceivable', 'operable', 'understandable', 'robust']

const LABEL: Record<Principle, string> = { perceivable: 'Perceivable', operable: 'Operable', understandable: 'Understandable', robust: 'Robust' }

export interface PrincipleTagProps extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, 'label'> {
  /** Figma "Principle": Perceivable / Operable / Understandable / Robust. */
  principle?: Principle
  /** Overrides the principle caption (Figma "Text" layer). */
  label?: ComponentChildren
}

/** Figma "Principle" (419:40149): a WCAG principle tag — principle-<name> glyph + caption on the principle colour. */
export function PrincipleTag({ principle = 'perceivable', label, class: cls, ...rest }: PrincipleTagProps) {
  return (
    <span {...rest} class={`bb-principle-tag ${cls ?? ''}`} data-principle={principle}>
      <Icon name={`principle-${principle}` as IconName} class="bb-principle-tag__icon" />
      <span class="bb-principle-tag__label">{label ?? LABEL[principle]}</span>
    </span>
  )
}
