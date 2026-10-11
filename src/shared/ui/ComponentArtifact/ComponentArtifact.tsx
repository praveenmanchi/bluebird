import type { ComponentChildren, JSX } from 'preact'
import type { IconName } from '../Icon/Icon'
import { ArtifactHeader } from '../ArtifactHeader/ArtifactHeader'
import { Button } from '../Button/Button'
import { ContextChip } from '../ContextChip/ContextChip'
import { MetaBadge } from '../MetaBadge/MetaBadge'
import './ComponentArtifact.css'

const PROPERTIES: readonly string[] = ['Type', 'State', 'Size', 'Label', 'Leading icon', 'Trailing icon']

/** The Figma Preview: Primary, Secondary and disabled Primary Buttons, Medium, fixed width, Variables glyph leading. */
function DefaultPreview() {
  return (
    <>
      <Button variant="primary" width="fixed" leadingIcon="variables">Button</Button>
      <Button variant="secondary" width="fixed" leadingIcon="variables">Button</Button>
      <Button variant="primary" width="fixed" leadingIcon="variables" disabled>Button</Button>
    </>
  )
}

export interface ComponentArtifactProps extends Omit<JSX.HTMLAttributes<HTMLElement>, 'title' | 'icon'> {
  /** Artifact Header "Title" — the component's name. */
  title?: ComponentChildren
  /** Artifact Header "Subtitle". */
  subtitle?: ComponentChildren
  /** Artifact Header Type glyph; defaults to `component`. */
  icon?: IconName
  /** The live preview slot. Defaults to the Figma preview of Button. */
  children?: ComponentChildren
  /** "Props" Meta Badges — the component's property names. */
  properties?: readonly ComponentChildren[]
  /** The "Code" Citation chip — where the component lives in code. */
  code?: ComponentChildren
  /** Header link label (Figma override "Go to component ↗"). */
  actionLabel?: ComponentChildren
  /** Fired by the header link. */
  onOpen?: () => void
}

/** Figma "Component Artifact" (40000285:8254): the UX AI chat's answer card for a component, with a live preview. */
export function ComponentArtifact({
  title = 'Button',
  subtitle = 'Atom · Components page · 12 variants · 8 properties',
  icon = 'component',
  children,
  properties = PROPERTIES,
  code = 'src/shared/ui/Button · Code Connect ✓',
  actionLabel = 'Go to component ↗',
  onOpen,
  class: cls,
  ...rest
}: ComponentArtifactProps) {
  return (
    <article {...rest} class={`bb-component-artifact ${cls ?? ''}`}>
      <ArtifactHeader icon={icon} title={title} subtitle={subtitle} actionLabel={actionLabel} onOpen={onOpen} class="bb-component-artifact__header" />
      <div class="bb-component-artifact__preview">{children ?? <DefaultPreview />}</div>
      <div class="bb-component-artifact__row">
        <span class="bb-component-artifact__caption">Props</span>
        {properties.map((p, i) => <MetaBadge key={i} tone="neutral">{p}</MetaBadge>)}
      </div>
      <div class="bb-component-artifact__row">
        <span class="bb-component-artifact__caption">Code</span>
        <ContextChip type="citation">{code}</ContextChip>
      </div>
    </article>
  )
}
