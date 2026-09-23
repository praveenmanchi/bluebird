import type { ComponentChildren, JSX } from 'preact'
import './Thumbnail.css'

export interface ThumbnailProps extends Omit<JSX.HTMLAttributes<HTMLElement>, 'src'> {
  src: string
  alt: string
  /** Figma "Caption". */
  caption?: ComponentChildren
}

/** Figma "Thumbnail" (40000158:7225): a captioned picture of the node under review. */
export function Thumbnail({ src, alt, caption = 'Before', class: cls, ...rest }: ThumbnailProps) {
  return (
    <figure {...rest} class={`bb-thumbnail ${cls ?? ''}`}>
      <img class="bb-thumbnail__img" src={src} alt={alt} />
      <figcaption class="bb-thumbnail__caption">{caption}</figcaption>
    </figure>
  )
}
