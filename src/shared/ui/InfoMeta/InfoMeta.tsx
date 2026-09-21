import type { ComponentChildren, JSX } from 'preact'
import { Icon, type IconName } from '../Icon/Icon'
import './InfoMeta.css'

export interface InfoMetaProps extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, 'icon'> {
  /** Figma text layers "20m" | "V2.11.0": each entry is one segment, separated by the "|" divider. */
  items: ComponentChildren[]
  /** Figma "Component" instance (the info-component glyph). */
  icon?: IconName
}

/** Figma "info" (133:1647): a footer meta line — glyph, then pipe-separated text segments. */
export function InfoMeta({ items, icon = 'info-component', class: cls, ...rest }: InfoMetaProps) {
  return (
    <span {...rest} class={`bb-info-meta ${cls ?? ''}`}>
      <span class="bb-info-meta__icon"><Icon name={icon} /></span>
      {items.map((item, i) => (
        <span key={i} class="bb-info-meta__segment">
          {i > 0 && <span class="bb-info-meta__divider" aria-hidden="true">|</span>}
          <span class="bb-info-meta__text">{item}</span>
        </span>
      ))}
    </span>
  )
}
