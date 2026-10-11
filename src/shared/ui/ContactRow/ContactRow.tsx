import type { ComponentChildren, JSX } from 'preact'
import { Icon } from '../Icon/Icon'
import './ContactRow.css'

export interface ContactRowProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Figma "Prompt". */
  prompt?: ComponentChildren
  /** Figma "Email" — rendered as a mailto: link. */
  email?: string
  /** Figma "Channel". */
  channel?: ComponentChildren
  /** Where the channel link goes. Without it the channel is shown as text. */
  channelHref?: string
}

/** Figma "Contact Row" (40000324:8452): who to contact for an access code or approval. */
export function ContactRow({
  prompt = 'Need access or lost your code? Contact the Design Systems team.',
  email = 'designsystems@hcltech.com', channel = 'Teams · #design-studio', channelHref,
  class: cls, ...rest
}: ContactRowProps) {
  return (
    <div {...rest} class={`bb-contact-row ${cls ?? ''}`}>
      <Icon name="message" class="bb-contact-row__icon" />
      <div class="bb-contact-row__copy">
        <p class="bb-contact-row__prompt">{prompt}</p>
        <p class="bb-contact-row__links">
          <a class="bb-contact-row__link" href={`mailto:${email}`} target="_blank" rel="noreferrer">{email}</a>
          <span class="bb-contact-row__dot" aria-hidden="true">·</span>
          {channelHref
            ? <a class="bb-contact-row__link" href={channelHref} target="_blank" rel="noreferrer">{channel}</a>
            : <span class="bb-contact-row__link">{channel}</span>}
        </p>
      </div>
    </div>
  )
}
