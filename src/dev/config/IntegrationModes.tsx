import { Toggle } from '@shared/ui'
import { SECRET_FIELDS, type IntegrationId } from '@shared/integrations'
import { SECTIONS, type ColumnSpec, type FieldSpec, type SectionSpec } from '@shell/integrations/sections'
import { IntegrationColumn, IntegrationField, type FieldContext } from '@shell/integrations/IntegrationField'
import { managedDefaults, managedErrors, type FieldValues } from './draft'

const IN_PLUGIN = 'In the plugin'
const ON_WEB = 'Set here'

export interface IntegrationModesProps {
  managed: Partial<Record<IntegrationId, FieldValues>>
  onChange: (section: IntegrationId, values: FieldValues | undefined) => void
}

/** Every Settings section with its source: each person fills it in the plugin, or this page sets it for the whole brand. */
export function IntegrationModes({ managed, onChange }: IntegrationModesProps) {
  return (
    <div class="cfg-integrations">
      {SECTIONS.map((spec) => (
        <IntegrationMode key={spec.id} spec={spec} values={managed[spec.id]} onChange={(v) => onChange(spec.id, v)} />
      ))}
    </div>
  )
}

interface IntegrationModeProps {
  spec: SectionSpec
  /** undefined: filled in the plugin. */
  values: FieldValues | undefined
  onChange: (values: FieldValues | undefined) => void
}

function IntegrationMode({ spec, values, onChange }: IntegrationModeProps) {
  const secrets = SECRET_FIELDS[spec.id] as readonly string[]
  const onWeb = values !== undefined
  const errors = values ? managedErrors(spec.id, values) : {}
  const ctx: FieldContext = {
    values: values ?? {},
    errors,
    disabled: false,
    // Keys stay with each person: shown greyed so the form still reads like the plugin's.
    locked: new Set(secrets),
    onChange: (key, value) => onChange({ ...values, [key]: value }),
  }
  const errorCount = Object.keys(errors).length
  return (
    <section class="cfg-integration" data-mode={onWeb ? 'web' : 'plugin'} aria-label={spec.title}>
      <div class="cfg-integration__row">
        <div class="cfg-integration__text">
          <h3 class="cfg-integration__title">{spec.title}</h3>
          <p class="cfg-integration__desc">{spec.description}</p>
        </div>
        <div class="cfg-integration__state">
          {onWeb && errorCount > 0 && <span class="dh-chip" data-tone="info">{errorCount} to fix</span>}
          {onWeb && secrets.length > 0 && <span class="dh-chip">Keys entered in plugin</span>}
          <div class="dh-seg" role="group" aria-label={`Where ${spec.title} is set`}>
            <button type="button" aria-pressed={!onWeb} onClick={() => onChange(undefined)}>{IN_PLUGIN}</button>
            <button type="button" aria-pressed={onWeb} onClick={() => { if (!onWeb) onChange(managedDefaults(spec.id)) }}>{ON_WEB}</button>
          </div>
        </div>
      </div>
      {onWeb && (
        <div class="cfg-integration__fields" data-columns={spec.columns}>
          {spec.toggleKey && (
            <Toggle
              class="cfg-integration__switch"
              title={`${spec.title} enabled`}
              description="Applies to everyone in this brand."
              checked={values[spec.toggleKey] === true}
              onChange={(on) => onChange({ ...values, [spec.toggleKey!]: on })}
            />
          )}
          {spec.blocks.map((block, i) => Array.isArray(block)
            ? <div key={i} class="bb-integrations__row">{(block as readonly ColumnSpec[]).map((column, j) => <IntegrationColumn key={j} spec={column} ctx={ctx} />)}</div>
            : <IntegrationField key={i} spec={block as FieldSpec} ctx={ctx} />)}
        </div>
      )}
    </section>
  )
}
