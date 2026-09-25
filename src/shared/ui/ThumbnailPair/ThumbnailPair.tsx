import type { JSX } from 'preact'
import { Thumbnail, type ThumbnailProps } from '../Thumbnail/Thumbnail'
import './ThumbnailPair.css'

export type ThumbnailPairShot = Omit<ThumbnailProps, 'class'>

export interface ThumbnailPairProps extends JSX.HTMLAttributes<HTMLDivElement> {
  before?: ThumbnailPairShot
  after?: ThumbnailPairShot
}

/** Figma "Thumbnail Pair" (40000159:7067): before and after, side by side. */
export function ThumbnailPair({ before, after, class: cls, ...rest }: ThumbnailPairProps) {
  const shots = [before, after].filter((s): s is ThumbnailPairShot => s !== undefined)
  if (shots.length === 0) return null
  return (
    <div {...rest} class={`bb-thumbnail-pair ${cls ?? ''}`} data-pair={shots.length > 1 || undefined}>
      {shots.map((shot, i) => (
        <Thumbnail key={shot.src} {...shot} caption={shot.caption ?? (i === 0 ? 'Before' : 'After')} />
      ))}
    </div>
  )
}
