import type { ComponentChildren, JSX } from 'preact'
import { Icon, type IconName } from '../Icon/Icon'
import './ChangeCount.css'

export type ChangeCountType = 'default' | 'added' | 'modified' | 'removed'
export type ChangeCountDisplay = 'icon-label' | 'icon' | 'label'
export type ChangeCountSurface = 'app' | 'report'

export const CHANGE_COUNT_LABEL: Readonly<Record<ChangeCountType, string>> = {
  default: 'Changes',
  added: 'Added',
  modified: 'Modified',
  removed: 'Removed',
}

/** The glyph each Figma Type variant draws (Tab Icons / Variables, UI Icons / General add + remove, Toolbar pencil). */
export const CHANGE_COUNT_ICON: Readonly<Record<ChangeCountType, IconName>> = {
  default: 'variables',
  added: 'ui-general-add',
  modified: 'ui-toolbar-pencil',
  removed: 'ui-general-remove',
}

export interface ChangeCountProps extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, 'label' | 'icon'> {
  /** Figma "Type": Default (neutral total) / Added / Modified / Removed. Sets the colour and the icon. */
  type?: ChangeCountType
  /** Figma "Display": Icon + label / Icon (icon only) / Label (label only). */
  display?: ChangeCountDisplay
  /** Figma "Surface": App (plugin UI, brand colours) or Report (the white Figma report). */
  surface?: ChangeCountSurface
  /** Figma "Count": the number in the coloured part. */
  count?: number | string
  /** Overrides the caption ("Added", "Modified" …). Icon-only chips still use it for screen readers and the tooltip. */
  label?: ComponentChildren
  /** Overrides the type's icon. */
  icon?: IconName
}

/**
 * Figma "Change count" (Atoms, 40002905:129272): how many variables or components were
 * added, modified or removed. An outlined part with the icon and/or label, then a filled
 * part with the number.
 */
export function ChangeCount({
  type = 'default',
  display = 'icon-label',
  surface = 'app',
  count = 0,
  label,
  icon,
  class: cls,
  title,
  ...rest
}: ChangeCountProps) {
  const caption = label ?? CHANGE_COUNT_LABEL[type]
  const iconOnly = display === 'icon'
  const tooltip = title ?? (iconOnly && typeof caption === 'string' ? caption : undefined)
  return (
    <span
      {...rest}
      title={tooltip}
      class={`bb-change-count ${cls ?? ''}`}
      data-type={type}
      data-display={display}
      data-surface={surface}
    >
      <span class="bb-change-count__lead">
        {display !== 'label' && <Icon name={icon ?? CHANGE_COUNT_ICON[type]} class="bb-change-count__icon" />}
        <span class={iconOnly ? 'bb-change-count__label bb-change-count__label--hidden' : 'bb-change-count__label'}>{caption}</span>
      </span>
      <span class="bb-change-count__count">{count}</span>
    </span>
  )
}
