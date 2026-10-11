import type { ComponentChildren, JSX } from 'preact'
import { Icon, type IconName } from '../Icon/Icon'
import './PromptChip.css'

export interface PromptChipProps extends Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'icon' | 'type'> {
  /** Figma "Label" — the suggested prompt. */
  children?: ComponentChildren
  /** The leading Tab Icons glyph (Figma instance swap; defaults to "colors"). */
  icon?: IconName
  /** Force the hover look (stories, visual regression). */
  state?: 'default' | 'hover'
  disabled?: boolean
  onClick?: JSX.MouseEventHandler<HTMLButtonElement>
}

/** Figma "Prompt Chip" (40000284:8202): a pill button suggesting a question to ask UX AI. */
export function PromptChip({ children = 'What is our primary colour?', icon = 'colors', state, class: cls, ...rest }: PromptChipProps) {
  return (
    <button {...rest} type="button" class={`bb-prompt-chip ${cls ?? ''}`} data-state={state}>
      <Icon name={icon} tone="default" class="bb-prompt-chip__icon" />
      <span class="bb-prompt-chip__label">{children}</span>
    </button>
  )
}
