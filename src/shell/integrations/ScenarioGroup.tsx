import { useState } from 'preact/hooks'
import { Button, MetaBadge, type MetaBadgeTone } from '@shared/ui'
import { IntegrationField, type FieldContext, type FieldValues } from './IntegrationField'
import { fieldKeys, flatFields, type ColumnSpec, type FieldSpec, type GroupSpec } from './sections'

/** `configured`: every key the group needs is filled in. `incomplete`: only some. `empty`: none. */
export type GroupState = 'configured' | 'incomplete' | 'empty'

const BADGE: Readonly<Record<GroupState, { label: string; tone: MetaBadgeTone }>> = {
  configured: { label: 'Configured', tone: 'success' },
  incomplete: { label: 'Incomplete', tone: 'warning' },
  empty: { label: 'Not set up', tone: 'neutral' },
}

export const GROUP_EMPTY_HINT = 'Not connected. The MCP tab asks for it when this scenario is picked.'

const filled = (value: FieldValues[string] | undefined): boolean => typeof value === 'string' && value.trim() !== ''

/** From the values as typed, so the badge follows the form before Save. */
export function groupState(requires: readonly string[], values: FieldValues): GroupState {
  const count = requires.filter((key) => filled(values[key])).length
  if (count === 0) return 'empty'
  return count === requires.length ? 'configured' : 'incomplete'
}

const fields = (column: ColumnSpec): readonly FieldSpec[] => (Array.isArray(column) ? column as readonly FieldSpec[] : [column as FieldSpec])

/** A row of a group: the first column grows, the ones after it are the narrow select column. */
function GroupRow({ columns, ctx }: { columns: readonly ColumnSpec[]; ctx: FieldContext }) {
  return (
    <div class="bb-integrations__group-row">
      {columns.map((column, i) => (
        <div key={i} class={i === 0 ? 'bb-integrations__group-main' : 'bb-integrations__group-side'}>
          {fields(column).map((field, j) => <IntegrationField key={j} spec={field} ctx={ctx} />)}
        </div>
      ))}
    </div>
  )
}

/**
 * One bordered card of a section, like a Dual File "File n card": the title and its status, then
 * the fields. While none of the keys it needs is filled in it stays closed behind Set up, so a
 * team that doesn't use the scenario isn't shown fields to skip.
 */
export function ScenarioGroup({ spec, ctx }: { spec: GroupSpec; ctx: FieldContext }) {
  const [opened, setOpened] = useState(false)
  const state = groupState(spec.requires, ctx.values)
  // A field error must stay reachable, even when the group would otherwise be closed.
  const hasError = flatFields(spec.blocks).flatMap(fieldKeys).some((key) => ctx.errors[key] !== undefined)
  const open = opened || state !== 'empty' || hasError
  const badge = BADGE[state]
  return (
    <div class="bb-integrations__group" role="group" aria-label={spec.title} data-group={spec.id} data-state={state}>
      <div class="bb-integrations__group-head">
        <h4 class="bb-integrations__group-title">{spec.title}</h4>
        <MetaBadge tone={badge.tone}>{badge.label}</MetaBadge>
      </div>
      {open
        ? spec.blocks.map((block, i) => Array.isArray(block)
          ? <GroupRow key={i} columns={block as readonly ColumnSpec[]} ctx={ctx} />
          : <IntegrationField key={i} spec={block as FieldSpec} ctx={ctx} />)
        : (
          <div class="bb-integrations__group-setup">
            <Button variant="secondary" leadingIcon="ui-general-add" disabled={ctx.disabled} onClick={() => setOpened(true)}>Set up</Button>
            <span class="bb-integrations__group-hint">{GROUP_EMPTY_HINT}</span>
          </div>
        )}
    </div>
  )
}
