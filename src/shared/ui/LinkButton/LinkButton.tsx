import type { ComponentChildren, JSX } from 'preact'
import { Icon, type IconName } from '../Icon/Icon'
import { labelText, linkIcon } from './linkIcon'
import './LinkButton.css'

export { EXTERNAL_LINK_ICON } from './linkIcon'

export interface LinkButtonProps extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'label' | 'icon'> {
  /** Figma "Label". */
  children?: ComponentChildren
  /**
   * Figma "Icon" — the trailing glyph, the size of the text. Left out, it follows the label (see linkIcon.ts),
   * like the Figma instances; `null` is Figma "Show icon" off.
   */
  icon?: IconName | null
}

/** Figma "Link Button" (40000157:7205): an inline action that reads as a link. */
export function LinkButton({ children = 'Select all', icon, class: cls, type = 'button', ...rest }: LinkButtonProps) {
  const text = icon === undefined ? labelText(children) : null
  const glyph = icon === undefined ? (text === null ? undefined : linkIcon(text)) : icon ?? undefined
  return (
    <button {...rest} type={type} class={`bb-link-button ${cls ?? ''}`} data-icon={glyph ? '' : undefined}>
      {children}
      {glyph && <Icon name={glyph} class="bb-link-button__icon" />}
    </button>
  )
}
