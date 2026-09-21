import type { ComponentChildren, JSX } from 'preact'
import { LOGOS } from '@logos'
import { Toggle } from '../Toggle/Toggle'
import './SectionHeader.css'

/** Integration logos available for the Figma "brands" instance (Property 1). */
export type SectionHeaderLogo = 'github' | 'storybook' | 'teams' | 'zeroheight'

export interface SectionHeaderProps extends Omit<JSX.HTMLAttributes<HTMLElement>, 'title' | 'onToggle'> {
  /** Figma "Title" text (+ "Title2" boolean when set). Omit to hide the title line. */
  title?: ComponentChildren
  /** Figma "Description " text. */
  description?: ComponentChildren
  /** Figma "Logo" boolean + "brands" instance swap. Omit to hide the logo. */
  logo?: SectionHeaderLogo
  /** Figma "Toggle" boolean — shows the trailing switch (hidden in Figma by default). */
  toggle?: boolean
  /** Switch Status when `toggle` is on. */
  checked?: boolean
  onToggle?: (checked: boolean) => void
  toggleDisabled?: boolean
  /** Custom trailing content instead of the switch. */
  trailing?: ComponentChildren
  /** Heading level for the title (defaults to h2). */
  as?: 'h1' | 'h2' | 'h3' | 'h4'
}

/** Figma "settings page title" (226:2612): optional integration logo, title + description stack, optional trailing switch. */
export function SectionHeader({ title, description, logo, toggle = false, checked = false, onToggle, toggleDisabled, trailing, as: Heading = 'h2', class: cls, ...rest }: SectionHeaderProps) {
  const art = logo ? LOGOS[logo] : undefined
  const toggleLabel = typeof title === 'string' ? title : undefined
  return (
    <header {...rest} class={`bb-section-header ${cls ?? ''}`} data-logo={logo} data-toggle={toggle || undefined}>
      {art && (
        <svg class="bb-section-header__logo" data-logo={logo} viewBox={art.viewBox} fill="none" role="img" aria-label={logo} dangerouslySetInnerHTML={{ __html: art.body }} />
      )}
      <div class="bb-section-header__stack">
        {title !== undefined && <Heading class="bb-section-header__title">{title}</Heading>}
        {description !== undefined && <p class="bb-section-header__description">{description}</p>}
      </div>
      {trailing ?? (toggle && <Toggle class="bb-section-header__toggle" checked={checked} onChange={onToggle} disabled={toggleDisabled} label={toggleLabel ?? 'Toggle section'} />)}
    </header>
  )
}
