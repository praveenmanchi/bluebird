import { useId, useState } from 'preact/hooks'
import { ButtonGroup, Icon, MetaBadge, Notice, SectionHeader, Toggle, type MetaBadgeTone } from '@shared/ui'
import { normalizeIntegration, validateIntegration, type ConnectionTestResult, type FieldErrors, type IntegrationId, type IntegrationValues } from '@shared/integrations'
import { IntegrationColumn, IntegrationField, type FieldValues } from './IntegrationField'
import { sectionFieldKeys, type ColumnSpec, type FieldSpec, type SectionSpec } from './sections'
import { sectionStatus, type SectionStatus } from './status'

export type SaveIntegration = (section: IntegrationId, values: IntegrationValues) => Promise<IntegrationValues>
export type TestIntegration = (section: IntegrationId, values: IntegrationValues) => Promise<ConnectionTestResult>

export interface IntegrationSectionProps {
  spec: SectionSpec
  initial: IntegrationValues
  onSave: SaveIntegration
  /** Wired Test Connection; without it the button explains that tests aren't available. */
  onTest?: TestIntegration
  /** Keys the brand manages (plugin.config.json): shown read-only, never edited here. */
  locked?: readonly string[]
  /** Who manages them, for the note above the fields. */
  lockedBy?: string
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

const STATUS: Readonly<Record<SectionStatus, { label: string; tone: MetaBadgeTone }>> = {
  configured: { label: 'Configured', tone: 'success' },
  missing: { label: 'Not configured', tone: 'warning' },
  off: { label: 'Off', tone: 'neutral' },
}

/** One bordered settings section: a header row (logo, title, description, status, arrow) that opens the fields and Test / Save actions. */
export function IntegrationSection({ spec, initial, onSave, onTest, locked = [], lockedBy = 'your brand' }: IntegrationSectionProps) {
  const [values, setValues] = useState<FieldValues>(initial as FieldValues)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [open, setOpen] = useState(false)
  /** What is stored, which is what the header's status reports; typing doesn't change it until Save. */
  const [saved, setSaved] = useState<IntegrationValues>(initial)
  const bodyId = useId()
  const saving = status.kind === 'saving'
  const testing = status.kind === 'testing'

  const onChange = (key: string, value: FieldValues[string]) => {
    setValues((v) => ({ ...v, [key]: value }))
    // A list field (extraFiles) carries its rows' errors as extraFiles.<i>.<field>; clear those with it.
    if (Object.keys(errors).some((k) => k === key || k.startsWith(`${key}.`))) setErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== key && !k.startsWith(`${key}.`))))
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
      const stored = await onSave(spec.id, next)
      setValues(stored as FieldValues)
      setSaved(stored)
      setStatus({ kind: 'saved' })
    } catch (error: unknown) {
      setStatus({ kind: 'failed', message: error instanceof Error ? error.message : 'Saving failed. Try again.' })
    }
  }

  const lockedKeys = new Set(locked)
  // Nothing left for the person to fill (a managed section without keys): no Save / Test to offer.
  const editable = sectionFieldKeys(spec).some((key) => !lockedKeys.has(key))
  const ctx = { values, errors, disabled: saving || testing, locked: lockedKeys, onChange }
  const badge = STATUS[sectionStatus(spec.id, saved)]
  return (
    <section class="bb-integrations__section" aria-label={spec.title} data-section={spec.id} data-columns={spec.columns}>
      <SectionHeader
        class="bb-integrations__header"
        as="h3"
        title={spec.title}
        description={spec.description}
        logo={spec.logo}
        onClick={() => setOpen((o) => !o)}
        trailing={
          <div class="bb-integrations__trailing">
            <MetaBadge tone={badge.tone}>{badge.label}</MetaBadge>
            {/* The switch only takes effect on Save, so it shows with the Save button. */}
            {open && spec.toggleKey && (
              <Toggle class="bb-section-header__toggle" label={spec.title} checked={values[spec.toggleKey] === true}
                disabled={saving || testing || lockedKeys.has(spec.toggleKey)} onChange={(checked) => onChange(spec.toggleKey!, checked)}
                onClick={(event) => event.stopPropagation()} />
            )}
            {/* The click reaches the header above, so the row and the arrow share one handler. */}
            <button type="button" class="bb-integrations__arrow" aria-expanded={open} aria-controls={bodyId} aria-label={`${open ? 'Hide' : 'Show'} ${spec.title} settings`}>
              <Icon name={open ? 'dropdown-up' : 'dropdown-down'} />
            </button>
          </div>
        }
      />
      {open && (
        <div id={bodyId} class="bb-integrations__body">
          {lockedKeys.size > 0 && (
            <Notice class="bb-integrations__managed" tone="info" title={`Set by ${lockedBy}`}>
              {editable ? 'Your design-system team set the locked fields for everyone. Add your own keys below and save.' : 'Your design-system team set this section for everyone. Nothing to fill in.'}
            </Notice>
          )}
          {spec.blocks.map((block, i) => Array.isArray(block)
            ? <div key={i} class="bb-integrations__row">{(block as readonly ColumnSpec[]).map((column, j) => <IntegrationColumn key={j} spec={column} ctx={ctx} />)}</div>
            : <IntegrationField key={i} spec={block as FieldSpec} ctx={ctx} />)}
          {editable && <ButtonGroup
            class="bb-integrations__actions"
            onSecondary={() => { void test() }}
            onPrimary={() => { void save() }}
            primaryLoading={saving}
            primaryDisabled={testing}
            secondaryLoading={testing}
            secondaryDisabled={saving}
          />}
          <div class="bb-integrations__status" aria-live="polite"><StatusNotice status={status} title={spec.title} /></div>
        </div>
      )}
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
