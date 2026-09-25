import type { ComponentChildren, JSX } from 'preact'
import './LinkButton.css'

export interface LinkButtonProps extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'label'> {
  /** Figma "Label". */
  children?: ComponentChildren
}

/** Figma "Link Button" (40000157:7205): an inline action that reads as a link. */
export function LinkButton({ children = 'Select all', class: cls, type = 'button', ...rest }: LinkButtonProps) {
  return (
    <button {...rest} type={type} class={`bb-link-button ${cls ?? ''}`}>
      {children}
    </button>
  )
}
