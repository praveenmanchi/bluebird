import type { ComponentChildren, JSX } from 'preact'
import { Icon, type IconName } from '../Icon/Icon'
import './ContextChip.css'

export type ContextChipType = 'selection' | 'source' | 'citation'

/** The glyph each Figma variant swaps in (Source: UI Icons / Sidebar › libraries since 2026-10-27). */
const ICON: Record<ContextChipType, IconName> = {
  selection: 'component-select',
  source: 'ui-sidebar-libraries',
  citation: 'text',
}

export interface ContextChipProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  /** Figma "Type": Selection (accent, what the user has selected) / Source (an attached file) / Citation (where an answer came from). */
  type?: ContextChipType
  /** Figma "State": force the Focus visuals (stories, visual regression). Real focus comes from :focus-visible when the chip is focusable. */
  state?: 'default' | 'focus'
  /** Figma "Label". */
  children?: ComponentChildren
  /** Overrides the variant's glyph (Figma lets an instance swap the nested Tab Icon). */
  icon?: IconName
}

/** Figma "Context Chip" (40000283:8207): a compact pill naming one piece of context in the UX AI chat. */
export function ContextChip({ type = 'selection', state, children = 'Ticket Row · State=Selected', icon, class: cls, ...rest }: ContextChipProps) {
  return (
    <span {...rest} class={`bb-context-chip ${cls ?? ''}`} data-type={type} data-state={state}>
      <Icon name={icon ?? ICON[type]} tone="default" class="bb-context-chip__icon" />
      <span class="bb-context-chip__label">{children}</span>
    </span>
  )
}
