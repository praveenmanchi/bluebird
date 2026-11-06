import type { ComponentChildren, JSX } from 'preact'
import { Icon, type IconName } from '../Icon/Icon'
import './Notice.css'

export type NoticeTone = 'info' | 'error'

export interface NoticeProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Figma "Tone". Error is announced (role="alert"). */
  tone?: NoticeTone
  /** Copy › Title. */
  title?: ComponentChildren
  /** Copy › Body. */
  children?: ComponentChildren
  /**
   * The Login Page's instance override: fills, stroke and icon removed, copy centred.
   * Not a Figma variant — the Notice there is a plain heading block.
   */
  bare?: boolean
}

const ICON: Record<NoticeTone, IconName> = { info: 'access', error: 'status-error' }
const COPY: Record<NoticeTone, { title: string; body: string }> = {
  info: { title: 'Private plugin · HCLTech only', body: 'You need an access code or approval from your organisation’s design-system admin to sign in.' },
  error: { title: 'Your account isn’t approved yet', body: 'Ask your design-system admin to add you to the Design Studio group, or use an access code instead.' },
}

/** Figma "Notice" (40000321:8423): an inline callout above a form — Info (access requirement) or Error (blocking problem). */
export function Notice({ tone = 'info', title = COPY[tone].title, children = COPY[tone].body, bare = false, class: cls, ...rest }: NoticeProps) {
  return (
    <div {...rest} class={`bb-notice ${cls ?? ''}`} data-tone={tone} data-bare={bare || undefined} role={tone === 'error' ? 'alert' : undefined}>
      {!bare && <Icon name={ICON[tone]} class="bb-notice__icon" />}
      <div class="bb-notice__copy">
        <p class="bb-notice__title">{title}</p>
        <p class="bb-notice__body">{children}</p>
      </div>
    </div>
  )
}
