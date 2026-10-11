import type { ComponentChildren, JSX } from 'preact'
import { Avatar } from '../Avatar/Avatar'
import './FieldRow.css'

export interface FieldRowProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'label'> {
  /** Figma "Label" — the field name in the fixed-width label column. */
  label?: ComponentChildren
  /** Figma "Value". */
  children?: ComponentChildren
  /** Figma "Show avatar" — the person avatar before the value. */
  showAvatar?: boolean
  /** Nested Avatar's Initials. */
  initials?: ComponentChildren
}

/** Figma "Field Row" (40000267:8056): one label → value line of the ticket detail. */
export function FieldRow({ label = 'Assignee', children = 'Praveen Manchi', showAvatar = true, initials = 'PM', class: cls, ...rest }: FieldRowProps) {
  return (
    <div {...rest} class={`bb-field-row ${cls ?? ''}`}>
      <span class="bb-field-row__label">{label}</span>
      <span class="bb-field-row__value">
        {showAvatar && <Avatar size="sm">{initials}</Avatar>}
        <span class="bb-field-row__text">{children}</span>
      </span>
    </div>
  )
}
