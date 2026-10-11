import type { ComponentChildren, JSX } from 'preact'
import './TypeSpecimen.css'

export type TypeSpecimenLevel = 'title' | 'label' | 'body' | 'caption'

/** Figma's default "Spec" text per Level. */
const SPEC: Record<TypeSpecimenLevel, string> = {
  title: 'font/size-title · 16 · SemiBold',
  label: 'font/size-label · 12 / 16.8 · Medium',
  body: 'font/size-body · 11 / 15.4 · Regular',
  caption: 'font/size-caption · 10 / 14 · Regular',
}

export interface TypeSpecimenProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Figma "Level": Title / Label / Body / Caption — the type style the specimen is set in. */
  level?: TypeSpecimenLevel
  /** The "Specimen" sample line. */
  children?: ComponentChildren
  /** The "Spec" line (token · size / line · weight). Defaults to the Level's Figma text. */
  spec?: ComponentChildren
}

/** Figma "Type Specimen" (40000285:8230): a sample line in one type level beside its spec. */
export function TypeSpecimen({ level = 'title', children = 'The quick brown fox jumps', spec, class: cls, ...rest }: TypeSpecimenProps) {
  return (
    <div {...rest} class={`bb-type-specimen ${cls ?? ''}`} data-level={level}>
      <span class="bb-type-specimen__specimen">{children}</span>
      <span class="bb-type-specimen__spec">{spec ?? SPEC[level]}</span>
    </div>
  )
}
