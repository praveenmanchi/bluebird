import type { JSX } from 'preact'
import { Icon, type IconName } from '../Icon/Icon'
import './ThemeChip.css'

export type ThemeChipTheme = 'forms' | 'gestures' | 'keyboard' | 'sensory' | 'whole-site' | 'wording' | 'zoom'

/** Figma "Property 1" option → code theme, EN label (String Translations instance) and theme-* glyph. */
export const THEME_CHIP_THEMES: Record<ThemeChipTheme, { figma: string; label: string; icon: IconName }> = {
  forms: { figma: 'Forms', label: 'Forms', icon: 'theme-forms' },
  gestures: { figma: 'Gestures', label: 'Gestures', icon: 'theme-gestures' },
  keyboard: { figma: 'Keyboard', label: 'Keyboard', icon: 'theme-keyboard' },
  sensory: { figma: 'Sensory', label: 'Sensory', icon: 'theme-sensory' },
  'whole-site': { figma: 'Whole Site', label: 'Whole Site', icon: 'theme-whole-site' },
  wording: { figma: 'Wording', label: 'Wording', icon: 'theme-wording' },
  zoom: { figma: 'Zoom and Legibility', label: 'Zoom and Legibility', icon: 'theme-zoom' },
}

export interface ThemeChipProps extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, 'label'> {
  /** Figma "Property 1": Forms / Gestures / Keyboard / Sensory / Whole Site / Wording / Zoom and Legibility. */
  theme: ThemeChipTheme
  /** Overrides the EN "String Translations" label. */
  label?: string
}

/** Figma "Theme" (419:45605): a WCAG theme chip with its theme-* glyph and label. */
export function ThemeChip({ theme, label, class: cls, ...rest }: ThemeChipProps) {
  const spec = THEME_CHIP_THEMES[theme]
  return (
    <span {...rest} data-theme={theme} class={`bb-theme-chip ${cls ?? ''}`}>
      <span class="bb-theme-chip__icon"><Icon name={spec.icon} /></span>
      <span class="bb-theme-chip__label">{label ?? spec.label}</span>
    </span>
  )
}
