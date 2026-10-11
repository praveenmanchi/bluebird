import type { ComponentChildren, JSX } from 'preact'
import './Avatar.css'

export type AvatarSize = 'sm' | 'md'

export interface AvatarProps extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, 'size'> {
  /** Figma "Size": Small (sm, 20) / Medium (md, 24). */
  size?: AvatarSize
  /** Figma "Initials". */
  children?: ComponentChildren
  /** The person's full name: becomes the accessible name, so screen readers do not spell out the initials. */
  name?: string
}

/** Figma "Avatar" (40000265:8042): a user's initials in a circle (assignee, reporter, comment author). */
export function Avatar({ size = 'sm', children = 'PM', name, class: cls, ...rest }: AvatarProps) {
  return (
    <span
      {...rest}
      class={`bb-avatar ${cls ?? ''}`}
      data-size={size}
      role={name ? 'img' : undefined}
      aria-label={name}
      title={name}
    >
      <span class="bb-avatar__initials" aria-hidden={name ? 'true' : undefined}>{children}</span>
    </span>
  )
}
