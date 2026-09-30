import type { ComponentChildren, JSX } from 'preact'
import { Button } from '../Button/Button'
import './ButtonGroup.css'

export interface ButtonGroupProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Figma "Save Configuration" instance (Type=Primary) label. */
  primaryLabel?: ComponentChildren
  /** Figma "Test Connection" instance (Type=Secondary) label. */
  secondaryLabel?: ComponentChildren
  /** Figma "Primary Button" boolean — shows the primary action (on by default, as in Figma). */
  showPrimary?: boolean
  /** Figma "Seconndary butto" boolean — shows the secondary action (on by default, as in Figma). */
  showSecondary?: boolean
  onPrimary?: () => void
  onSecondary?: () => void
  primaryDisabled?: boolean
  secondaryDisabled?: boolean
  /** Shows the primary action as busy (spinner) and disables it. */
  primaryLoading?: boolean
  /** Shows the secondary action as busy (spinner) and disables it. */
  secondaryLoading?: boolean
  /** Custom content instead of the two default Buttons (secondary first, primary last, as in Figma); ignores showPrimary/showSecondary. */
  children?: ComponentChildren
}

/** Figma "Container" (215:12537): a right-aligned pair of Buttons — Secondary then Primary, each shown by its own boolean. */
export function ButtonGroup({ primaryLabel = 'Save Configuration', secondaryLabel = 'Test Connection', showPrimary = true, showSecondary = true, onPrimary, onSecondary, primaryDisabled, secondaryDisabled, primaryLoading, secondaryLoading, children, class: cls, ...rest }: ButtonGroupProps) {
  return (
    <div {...rest} role="group" class={`bb-button-group ${cls ?? ''}`}>
      {children ?? (
        <>
          {showSecondary && <Button variant="secondary" onClick={onSecondary} disabled={secondaryDisabled} loading={secondaryLoading}>{secondaryLabel}</Button>}
          {showPrimary && <Button variant="primary" onClick={onPrimary} disabled={primaryDisabled} loading={primaryLoading}>{primaryLabel}</Button>}
        </>
      )}
    </div>
  )
}
