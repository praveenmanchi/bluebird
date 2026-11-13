import type { ComponentChildren, JSX } from 'preact'
import { Icon, type IconName } from '../Icon/Icon'
import './Tab.css'

export type TabVariant = 'default' | 'active' | 'variant3'

export interface TabProps extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'icon' | 'label'> {
  /** Figma "Property 1": Default / Active / Variant3 (the compact 28×28 icon-only tab used in Navbar and PersonaCard). "Property 1=Focus" is `state="focus"`. */
  variant?: TabVariant
  /** Figma "Label". */
  children?: ComponentChildren
  /** Figma "Icon" (INSTANCE_SWAP of a Tab Icon). */
  icon?: IconName
  /** Figma "Show Header Icons". */
  showIcon?: boolean
  /** Figma "Variant 3 text": show the label inside the compact variant (hidden in Figma by default). */
  showVariant3Text?: boolean
  /** Force the Hover or Focus visuals (stories, visual regression). Focus is Figma "Property 1=Focus"; Figma has no Hover variant for Tab. */
  state?: 'default' | 'hover' | 'focus'
}

/** Figma "Tab" (91:1989); "Tab" 419:39986 (TabLegacy) is an older alias. Renders <button role="tab">. */
export function Tab({ variant = 'default', children, icon = 'variables', showIcon = true, showVariant3Text = false, state, class: cls, type = 'button', ...rest }: TabProps) {
  const compact = variant === 'variant3'
  const showLabel = children !== undefined && (!compact || showVariant3Text)
  return (
    <button
      {...rest}
      type={type}
      role="tab"
      aria-selected={variant === 'active'}
      aria-label={!showLabel && typeof children === 'string' ? children : undefined}
      data-variant={variant}
      data-state={state}
      class={`bb-tab ${cls ?? ''}`}
    >
      {showIcon && <span class="bb-tab__icon"><Icon name={icon} /></span>}
      {showLabel && <span class="bb-tab__label">{children}</span>}
    </button>
  )
}
