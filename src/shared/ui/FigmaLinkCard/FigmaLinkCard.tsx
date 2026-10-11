import type { ComponentChildren, JSX } from 'preact'
import { Icon } from '../Icon/Icon'
import './FigmaLinkCard.css'

export interface FigmaLinkCardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Figma "Frame" — the linked frame's name. */
  frame?: ComponentChildren
  /** Figma "Path" — page › section the frame lives in. */
  path?: ComponentChildren
  /** "Open in Figma" action: jump to the node. */
  onOpen?: () => void
  /** "Copy link" action: copy the node URL. */
  onCopy?: () => void
}

/** Figma "Figma Link Card" (40000268:8066): a Figma frame linked to the Jira issue, with Open and Copy. */
export function FigmaLinkCard({ frame = 'WCAG Card / Mode=colors', path = 'Plugin UI › Components', onOpen, onCopy, class: cls, ...rest }: FigmaLinkCardProps) {
  return (
    <div {...rest} class={`bb-figma-link-card ${cls ?? ''}`}>
      <span class="bb-figma-link-card__thumb"><Icon name="component" tone="default" /></span>
      <span class="bb-figma-link-card__text">
        <span class="bb-figma-link-card__frame">{frame}</span>
        <span class="bb-figma-link-card__path">{path}</span>
      </span>
      <span class="bb-figma-link-card__actions">
        <button type="button" class="bb-figma-link-card__action" aria-label="Open in Figma" onClick={onOpen}>
          <Icon name="show" tone="default" />
        </button>
        <button type="button" class="bb-figma-link-card__action" aria-label="Copy link" onClick={onCopy}>
          <Icon name="copy" tone="default" />
        </button>
      </span>
    </div>
  )
}
