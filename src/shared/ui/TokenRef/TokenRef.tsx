import type { JSX } from 'preact'
import { Icon } from '../Icon/Icon'
import './TokenRef.css'

export interface TokenRefProps extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, 'name'> {
  /** Figma "Name" — the variable path as Figma spells it, e.g. "Brand/Text/Secondary". */
  name: string
  /** Figma "Mode" (+ "Show mode") — the mode the value was read in. */
  mode?: string
}

/** Figma "Token Ref" (40000157:7199): the variable behind a raw value. */
export function TokenRef({ name, mode, class: cls, ...rest }: TokenRefProps) {
  return (
    <span {...rest} class={`bb-token-ref ${cls ?? ''}`} title={mode ? `${name} · mode ${mode}` : name}>
      <Icon name="ui-variable-color" class="bb-token-ref__icon" />
      <span class="bb-token-ref__name">{name}</span>
      {mode !== undefined && <span class="bb-token-ref__mode">{mode}</span>}
    </span>
  )
}
