import type { ComponentChildren } from 'preact'
import { Icon, type IconName } from '@shared/ui'

export interface LoginHeadingProps {
  /** Mark › Mark icon: "access" on the access-code card, "url" on the SSO card. */
  icon: IconName
  /** Heading › Title. */
  title: ComponentChildren
  /** Heading › Subtitle (the SSO card only). */
  subtitle?: ComponentChildren
  titleId?: string
}

/** The login card's "Heading" frame: Mark (40 square, 18 glyph) · Title · optional Subtitle. Styles live in LoginScreen.css. */
export function LoginHeading({ icon, title, subtitle, titleId }: LoginHeadingProps) {
  return (
    <div class="bb-login__heading">
      <span class="bb-login__mark" aria-hidden="true"><Icon name={icon} /></span>
      <h1 id={titleId} class="bb-login__title">{title}</h1>
      {subtitle !== undefined && <p class="bb-login__subtitle">{subtitle}</p>}
    </div>
  )
}
