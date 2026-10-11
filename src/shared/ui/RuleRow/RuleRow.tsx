import type { ComponentChildren, JSX } from 'preact'
import { Checkbox } from '../Checkbox/Checkbox'
import { Rating, type RatingLevel } from '../Rating/Rating'
import './RuleRow.css'

export interface RuleRowProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'name' | 'onToggle'> {
  /** Figma "Name" — the rule id and title. */
  name?: ComponentChildren
  /** Figma "Description". */
  description?: ComponentChildren
  /** The "Enabled" Checkbox instance (Selected=Checked in Figma). */
  enabled?: boolean
  /** The "Level" Rating instance (Rating=AA in Figma). */
  level?: RatingLevel
  /** Accessible name of the checkbox when `name` is not plain text. */
  toggleLabel?: string
  /** Checkbox toggled; receives the new enabled value. */
  onToggle?: (enabled: boolean) => void
}

/** Figma "Rule Row" (40000296:8401): one rule of an agent's rule pack, switchable, with its WCAG level. */
export function RuleRow({
  name = '1.4.3 Contrast (minimum)',
  description = 'Text 4.5:1, large text 3:1, checked in every brand mode',
  enabled = true, level = 'AA', toggleLabel, onToggle, class: cls, ...rest
}: RuleRowProps) {
  const label = toggleLabel ?? (typeof name === 'string' ? name : 'Enable rule')
  return (
    <div {...rest} class={`bb-rule-row ${cls ?? ''}`} data-enabled={enabled}>
      <Checkbox checked={enabled} aria-label={label} onChange={onToggle} class="bb-rule-row__toggle" />
      <div class="bb-rule-row__text">
        <span class="bb-rule-row__name">{name}</span>
        <span class="bb-rule-row__description">{description}</span>
      </div>
      <Rating rating={level} class="bb-rule-row__level" />
    </div>
  )
}
