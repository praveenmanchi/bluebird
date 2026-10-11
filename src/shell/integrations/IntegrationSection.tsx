import { useState } from 'preact/hooks'
import { ButtonGroup, Notice, SectionHeader } from '@shared/ui'
import { normalizeIntegration, validateIntegration, type ConnectionTestResult, type FieldErrors, type IntegrationId, type IntegrationValues } from '@shared/integrations'
import { IntegrationColumn, IntegrationField, type FieldValues } from './IntegrationField'
import type { ColumnSpec, FieldSpec, SectionSpec } from './sections'

export type SaveIntegration = (section: IntegrationId, values: IntegrationValues) => Promise<IntegrationValues>
export type TestIntegration = (section: IntegrationId, values: IntegrationValues) => Promise<ConnectionTestResult>

export interface IntegrationSectionProps {
  spec: SectionSpec
  initial: IntegrationValues
  onSave: SaveIntegration
  /** Wired Test Connection; without it the button explains that tests aren't available. */
  onTest?: TestIntegration
}

type Status =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'invalid' }
  | { kind: 'failed'; message: string }
  | { kind: 'test' }
  | { kind: 'testing' }
  | { kind: 'tested'; message: string }
  | { kind: 'test-failed'; message: string }

export const TEST_UNAVAILABLE = 'Connection tests aren’t wired up yet, so nothing was sent. Save stores these values on this device for your Figma account only.'

/** One bordered settings section: header (logo, title, description, optional switch), fields, Test / Save actions. */
export function IntegrationSection({ spec, initial, onSave, onTest }: IntegrationSectionProps) {
  const [values, setValues] = useState<FieldValues>(initial as FieldValues)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const saving = status.kind === 'saving'
  const testing = status.kind === 'testing'

  const onChange = (key: string, value: string | boolean) => {
    setValues((v) => ({ ...v, [key]: value }))
    if (errors[key]) setErrors(({ [key]: _cleared, ...rest }) => rest)
    if (status.kind !== 'idle' && status.kind !== 'saving' && status.kind !== 'testing') setStatus({ kind: 'idle' })
  }

  /** Tests the values as typed (unsaved), after the same field checks Save runs. */
  const test = async () => {
    if (!onTest) { setStatus({ kind: 'test' }); return }
    const next = normalizeIntegration(values as IntegrationValues, spec.id)
    setValues(next as FieldValues)
    const found = validateIntegration(spec.id, next)
    setErrors(found)
    if (Object.keys(found).length) { setStatus({ kind: 'invalid' }); return }
    setStatus({ kind: 'testing' })
    try {
      setStatus({ kind: 'tested', message: (await onTest(spec.id, next)).message })
    } catch (error: unknown) {
      setStatus({ kind: 'test-failed', message: error instanceof Error ? error.message : 'The connection test failed. Try again.' })
    }
  }

  const save = async () => {
    const next = normalizeIntegration(values as IntegrationValues, spec.id)
    setValues(next as FieldValues)
    const found = validateIntegration(spec.id, next)
    setErrors(found)
    if (Object.keys(found).length) { setStatus({ kind: 'invalid' }); return }
    setStatus({ kind: 'saving' })
    try {
      setValues(await onSave(spec.id, next) as FieldValues)
      setStatus({ kind: 'saved' })
    } catch (error: unknown) {
      setStatus({ kind: 'failed', message: error instanceof Error ? error.message : 'Saving failed. Try again.' })
    }
  }

  const ctx = { values, errors, disabled: saving || testing, onChange }
  return (
    <section class="bb-integrations__section" aria-label={spec.title} data-section={spec.id} data-columns={spec.columns}>
      <SectionHeader
        as="h3"
        title={spec.title}
        description={spec.description}
        logo={spec.logo}
        toggle={spec.toggleKey !== undefined}
        checked={spec.toggleKey ? values[spec.toggleKey] === true : false}
        toggleDisabled={saving || testing}
        onToggle={spec.toggleKey ? (checked) => onChange(spec.toggleKey!, checked) : undefined}
      />
      {spec.blocks.map((block, i) => Array.isArray(block)
        ? <div key={i} class="bb-integrations__row">{(block as readonly ColumnSpec[]).map((column, j) => <IntegrationColumn key={j} spec={column} ctx={ctx} />)}</div>
        : <IntegrationField key={i} spec={block as FieldSpec} ctx={ctx} />)}
      <ButtonGroup
        class="bb-integrations__actions"
        onSecondary={() => { void test() }}
        onPrimary={() => { void save() }}
        primaryLoading={saving}
        primaryDisabled={testing}
        secondaryLoading={testing}
        secondaryDisabled={saving}
      />
      <div class="bb-integrations__status" aria-live="polite"><StatusNotice status={status} title={spec.title} /></div>
    </section>
  )
}

function StatusNotice({ status, title }: { status: Status; title: string }) {
  switch (status.kind) {
    case 'saved': return <Notice tone="info" title="Saved">{title} settings are stored for your Figma account on this device.</Notice>
    case 'invalid': return <Notice tone="error" title="Check the highlighted fields">Nothing was saved or sent.</Notice>
    case 'testing': return <Notice tone="info" title="Testing the connection…">Trying these values without saving them.</Notice>
    case 'tested': return <Notice tone="info" title="Connection works">{status.message} Save to keep these values.</Notice>
    case 'test-failed': return <Notice tone="error" title="Connection failed">{status.message}</Notice>
    case 'failed': return <Notice tone="error" title="Couldn’t save">{status.message}</Notice>
    case 'test': return <Notice tone="info" title="Connection test unavailable">{TEST_UNAVAILABLE}</Notice>
    default: return null
  }
}
