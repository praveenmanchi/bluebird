// "Use a company gateway" (Figma "Settings · 600 · Sign-in or token"): a switch
// styled like the section's other switches, and the gateway's address under it
// while it's on. Off clears the address, so a saved section has no gateway.
import { useState } from 'preact/hooks'
import { Input, Toggle } from '@shared/ui'
import { MAX_TEXT } from '@shared/integrations'
import type { FieldContext } from './IntegrationField'
import type { GatewaySpec } from './sections'

export function GatewayField({ spec, ctx }: { spec: GatewaySpec; ctx: FieldContext }) {
  const value = typeof ctx.values[spec.key] === 'string' ? ctx.values[spec.key] as string : ''
  const [on, setOn] = useState(value !== '')
  const disabled = ctx.disabled || ctx.locked?.has(spec.key) === true
  const error = ctx.errors[spec.key]
  const toggle = (next: boolean) => {
    setOn(next)
    if (!next) ctx.onChange(spec.key, '')
  }
  return (
    <div class="bb-connection__gateway">
      <Toggle class="bb-integrations__switch" title="Use a company gateway" description={spec.description} checked={on || value !== ''} disabled={disabled} onChange={toggle} />
      {(on || value !== '') && (
        <Input
          label="Company gateway URL" icon="url" value={value} placeholder="https://bluebird-gateway.yourcompany.com"
          helperText={error ?? 'Your IT team gives you this address.'} error={error !== undefined} disabled={disabled}
          maxLength={MAX_TEXT} autoComplete="off" spellcheck={false} onValueChange={(v) => ctx.onChange(spec.key, v)}
        />
      )}
    </div>
  )
}
