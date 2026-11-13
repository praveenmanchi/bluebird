import type { ComponentChildren, JSX } from 'preact'
import { Icon, type IconName } from '../Icon/Icon'
import './LinkButton.css'

export interface LinkButtonProps extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'label'> {
  /** Figma "Label". */
  children?: ComponentChildren
  /** Trailing glyph, the size of the text. Links that leave the plugin use `open-link` (see EXTERNAL_LINK_ICON) instead of a typed arrow. */
  icon?: IconName
}

/** The glyph on every link that opens Jira, Figma, a docs page or any other place outside the plugin. */
export const EXTERNAL_LINK_ICON: IconName = 'ui-prototype-open-link'

/** Figma "Link Button" (40000157:7205): an inline action that reads as a link. */
export function LinkButton({ children = 'Select all', icon, class: cls, type = 'button', ...rest }: LinkButtonProps) {
  return (
    <button {...rest} type={type} class={`bb-link-button ${cls ?? ''}`} data-icon={icon ? '' : undefined}>
      {children}
      {icon && <Icon name={icon} class="bb-link-button__icon" />}
    </button>
  )
}
