import type { ComponentChildren, JSX } from 'preact'
import { ArtifactHeader } from '../ArtifactHeader/ArtifactHeader'
import { TypeSpecimen, type TypeSpecimenLevel } from '../TypeSpecimen/TypeSpecimen'
import './TypeArtifact.css'

export interface TypeArtifactLevel {
  level: TypeSpecimenLevel
  /** Sample text; defaults to the Type Specimen sample. */
  sample?: ComponentChildren
  /** Spec text; defaults to the Level's Figma spec. */
  spec?: ComponentChildren
}

const LEVELS: readonly TypeArtifactLevel[] = [{ level: 'title' }, { level: 'label' }, { level: 'body' }, { level: 'caption' }]

export interface TypeArtifactProps extends Omit<JSX.HTMLAttributes<HTMLElement>, 'title'> {
  /** Artifact Header "Title" override. */
  title?: ComponentChildren
  /** Artifact Header "Subtitle" override. */
  subtitle?: ComponentChildren
  /** The Type Specimen rows, top to bottom. */
  levels?: readonly TypeArtifactLevel[]
  actionLabel?: ComponentChildren
  /** Fired by the header's "Open in Figma" link. */
  onOpen?: () => void
}

/** Figma "Type Artifact" (40000285:8231): the UX AI chat's answer card for a type scale. */
export function TypeArtifact({
  title = 'Type scale · Noto Sans',
  subtitle = 'Semantics font tokens · family from Brand UI font/family-ui',
  levels = LEVELS,
  actionLabel,
  onOpen,
  class: cls,
  ...rest
}: TypeArtifactProps) {
  return (
    <article {...rest} class={`bb-type-artifact ${cls ?? ''}`}>
      <ArtifactHeader icon="text" title={title} subtitle={subtitle} actionLabel={actionLabel} onOpen={onOpen} class="bb-type-artifact__header" />
      {levels.map((l) => (
        <TypeSpecimen key={l.level} level={l.level} spec={l.spec} class="bb-type-artifact__specimen">{l.sample}</TypeSpecimen>
      ))}
    </article>
  )
}
