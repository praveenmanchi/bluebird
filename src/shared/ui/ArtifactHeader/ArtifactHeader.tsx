import type { ComponentChildren, JSX } from 'preact'
import { Icon, type IconName } from '../Icon/Icon'
import { LinkButton } from '../LinkButton/LinkButton'
import './ArtifactHeader.css'

export interface ArtifactHeaderProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'title' | 'icon'> {
  /** Figma "Title" — the artifact's name (variable, component, type scale). */
  title?: ComponentChildren
  /** Figma "Subtitle" — what kind of artifact it is and where it lives. */
  subtitle?: ComponentChildren
  /** The Tab Icons glyph in the "Type" tile (Figma instance swap); defaults to `colors`. */
  icon?: IconName
  /** Label of the "Open" Link Button. */
  actionLabel?: ComponentChildren
  /** Fired by the "Open" Link Button (e.g. reveal the node in Figma). */
  onOpen?: () => void
}

/** Figma "Artifact Header" (40000285:8144): type tile, title + subtitle, and the open-in-Figma link. */
export function ArtifactHeader({
  title = 'surface/accent',
  subtitle = 'Colour variable · Brand UI · used in 38 layers',
  icon = 'colors',
  actionLabel = 'Open in Figma ↗',
  onOpen,
  class: cls,
  ...rest
}: ArtifactHeaderProps) {
  return (
    <div {...rest} class={`bb-artifact-header ${cls ?? ''}`}>
      <span class="bb-artifact-header__type">
        <Icon name={icon} tone="default" class="bb-artifact-header__icon" />
      </span>
      <div class="bb-artifact-header__text">
        <span class="bb-artifact-header__title">{title}</span>
        <span class="bb-artifact-header__subtitle">{subtitle}</span>
      </div>
      <LinkButton class="bb-artifact-header__open" onClick={onOpen}>{actionLabel}</LinkButton>
    </div>
  )
}
