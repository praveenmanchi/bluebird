import type { JSX } from 'preact'
import { Icon } from '@shared/ui'
import './SettingsButton.css'

export interface SettingsButtonProps extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'icon'> {
  /** Figma "Property 1": Variant2 = the settings screen is open (indicator stroke below the glyph). */
  active?: boolean
}

/** Figma "settings" (7:44580): the gear at the right end of the tab row, Default / Variant2 (active). */
export function SettingsButton({ active = false, class: cls, ...rest }: SettingsButtonProps) {
  return (
    <button type="button" aria-label="Settings" aria-pressed={active} {...rest} class={`bb-settings-button ${cls ?? ''}`} data-active={active || undefined}>
      <Icon name="settings" class="bb-settings-button__glyph" />
    </button>
  )
}
