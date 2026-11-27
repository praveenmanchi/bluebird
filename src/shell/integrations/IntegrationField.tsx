import { Icon, Input, SegmentedControl, TextArea, Toggle } from '@shared/ui'
import { MAX_INSTRUCTIONS, MAX_TEXT, type FieldErrors, type LibraryFileEntry } from '@shared/integrations'
import { ConnectionCard } from './ConnectionCard'
import { GatewayField } from './GatewayField'
import { LibraryFilesList } from './LibraryFilesList'
import { ScenarioGroup } from './ScenarioGroup'
import { SelectInput } from './SelectInput'
import type { ColumnSpec, FieldSpec, HostSpec } from './sections'

export type FieldValues = Record<string, string | boolean | readonly LibraryFileEntry[]>

export interface FieldContext {
  values: FieldValues
  errors: FieldErrors
  disabled: boolean
  /** Brand-managed keys: shown, not editable. */
  locked?: ReadonlySet<string>
  onChange: (key: string, value: FieldValues[string]) => void
  /** Opens a sign-in or help page in the browser (the sandbox's figma.openExternal in the plugin). */
  openExternal?: (url: string) => void
}

const openInTab = (url: string) => { window.open(url, '_blank', 'noopener') }

const str = (v: FieldValues[string] | undefined) => typeof v === 'string' ? v : ''

/** One Figma instance of a settings section: Input Box, dropbox, Toggle, Text Area, an AI provider row or a group card of them. */
export function IntegrationField({ spec, ctx }: { spec: FieldSpec; ctx: FieldContext }) {
  const { values, errors, onChange } = ctx
  const disabled = ctx.disabled || ('key' in spec && ctx.locked?.has(spec.key) === true)
  switch (spec.kind) {
    case 'text': {
      const error = errors[spec.key]
      const bitbucket = spec.hostKey !== undefined && values[spec.hostKey] === 'bitbucket'
      if (spec.onlyBitbucket && !bitbucket) return null
      const copy = bitbucket ? { ...spec, ...spec.bitbucket } : spec
      return (
        <Input
          label={copy.label}
          icon={spec.icon}
          password={spec.secret}
          value={str(values[spec.key])}
          placeholder={copy.placeholder}
          helperText={error ?? copy.helper}
          error={error !== undefined}
          disabled={disabled}
          maxLength={MAX_TEXT}
          autoComplete={spec.secret ? 'new-password' : 'off'}
          spellcheck={false}
          onValueChange={(v) => onChange(spec.key, v)}
        />
      )
    }
    case 'select':
      return <SelectInput label={spec.label} icon={spec.icon} value={str(values[spec.key])} options={spec.options} disabled={disabled} onChange={(v) => onChange(spec.key, v)} />
    case 'switch':
      return <Toggle class="bb-integrations__switch" title={spec.title} description={spec.description} checked={values[spec.key] === true} disabled={disabled} onChange={(v) => onChange(spec.key, v)} />
    case 'textarea':
      return <TextArea label={spec.label} placeholder={spec.placeholder} helperText={spec.helper} maxLength={MAX_INSTRUCTIONS} value={str(values[spec.key])} disabled={disabled} onValueChange={(v) => onChange(spec.key, v)} />
    case 'files': {
      const rows = values[spec.key]
      return (
        <LibraryFilesList
          label={spec.label}
          files={Array.isArray(rows) ? rows : []}
          errors={errors}
          disabled={disabled}
          onChange={(next) => onChange(spec.key, next)}
        />
      )
    }
    case 'group':
      return <ScenarioGroup spec={spec} ctx={ctx} />
    case 'connection':
      return <ConnectionCard spec={spec} ctx={ctx} openExternal={ctx.openExternal ?? openInTab} />
    case 'gateway':
      return <GatewayField spec={spec} ctx={ctx} />
    case 'host':
      return <HostField spec={spec} ctx={ctx} disabled={disabled} />
    case 'provider':
      return (
        <div class="bb-integrations__provider">
          <span class="bb-integrations__provider-mark"><Icon name={`ai-${spec.provider}`} /></span>
          <div class="bb-integrations__provider-model"><IntegrationField spec={spec.model} ctx={ctx} /></div>
          <div class="bb-integrations__provider-key"><IntegrationField spec={spec.apiKey} ctx={ctx} /></div>
        </div>
      )
  }
}

const HOSTS = [{ value: 'github', label: 'GitHub' }, { value: 'bitbucket', label: 'Bitbucket' }] as const

/** "Where's your code?": GitHub or Bitbucket. Switching clears the token and sign-in, which belong to the other host. */
function HostField({ spec, ctx, disabled }: { spec: HostSpec; ctx: FieldContext; disabled: boolean }) {
  const value = ctx.values[spec.key] === 'bitbucket' ? 'bitbucket' : 'github'
  const pick = (next: string) => {
    for (const key of spec.clears) ctx.onChange(key, '')
    ctx.onChange(spec.key, next)
  }
  return (
    <div class="bb-integrations__host">
      {spec.label && <span class="bb-integrations__group-title">{spec.label}</span>}
      <SegmentedControl aria-label={spec.label ?? 'Code host'} value={value} options={HOSTS} disabled={disabled} onChange={pick} />
    </div>
  )
}

/** A column of a row: one field, or a stack of fields. */
export function IntegrationColumn({ spec, ctx }: { spec: ColumnSpec; ctx: FieldContext }) {
  if (!Array.isArray(spec)) return <div class="bb-integrations__column"><IntegrationField spec={spec as FieldSpec} ctx={ctx} /></div>
  return <div class="bb-integrations__column">{(spec as readonly FieldSpec[]).map((field, i) => <IntegrationField key={i} spec={field} ctx={ctx} />)}</div>
}
