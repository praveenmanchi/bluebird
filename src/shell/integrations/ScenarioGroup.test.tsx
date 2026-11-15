import { describe, it, expect, vi } from 'vitest'
import { useState } from 'preact/hooks'
import { fireEvent, render, screen, within } from '@testing-library/preact'
import { DEFAULT_INTEGRATIONS, type FieldErrors } from '@shared/integrations'
import { IntegrationField, type FieldValues } from './IntegrationField'
import { GROUP_EMPTY_HINT, groupState } from './ScenarioGroup'
import { SECTIONS, type FieldSpec, type GroupSpec } from './sections'

const group = (id: string): GroupSpec => {
  const found = SECTIONS.find((s) => s.id === 'mcp')!.blocks.find((block) => !Array.isArray(block) && (block as FieldSpec).kind === 'group' && (block as GroupSpec).id === id)
  if (!found) throw new Error(`No ${id} group in the MCP section`)
  return found as GroupSpec
}

interface HarnessProps { id?: string; initial?: FieldValues; errors?: FieldErrors; disabled?: boolean; locked?: readonly string[]; onChange?: (key: string, value: unknown) => void }

/** The group with the section's part played: values held in state, as IntegrationSection holds them. */
function Harness({ id = 'component', initial = {}, errors = {}, disabled = false, locked = [], onChange }: HarnessProps) {
  const [values, setValues] = useState<FieldValues>({ ...DEFAULT_INTEGRATIONS.mcp, ...initial })
  const change = (key: string, value: FieldValues[string]) => { onChange?.(key, value); setValues((v) => ({ ...v, [key]: value })) }
  return <IntegrationField spec={group(id)} ctx={{ values, errors, disabled, locked: new Set(locked), onChange: change }} />
}

const card = (name = 'Component to Storybook') => screen.getByRole('group', { name })
/** The status pill of a card: MetaBadge carries its tone on the pill, not on the label inside it. */
const badge = (label: string, inside = card()) => within(inside).getByText(label).closest('.bb-meta-badge')
const REPO = 'Repository (owner/repo)'
const TOKEN = 'Personal access token'

describe('groupState', () => {
  it('is configured when every required key is filled, incomplete when some are, empty when none is', () => {
    const requires = ['componentRepo', 'componentToken']
    expect(groupState(requires, { componentRepo: '', componentToken: '' })).toBe('empty')
    expect(groupState(requires, {})).toBe('empty')
    expect(groupState(requires, { componentRepo: '   ', componentToken: '' })).toBe('empty')
    expect(groupState(requires, { componentRepo: 'a/b', componentToken: '' })).toBe('incomplete')
    expect(groupState(requires, { componentRepo: '', componentToken: 't' })).toBe('incomplete')
    expect(groupState(requires, { componentRepo: 'a/b', componentToken: 't' })).toBe('configured')
    expect(groupState(requires, { componentRepo: 'a/b', componentToken: true })).toBe('incomplete')
  })
})

describe('ScenarioGroup', () => {
  it('is a labelled card that starts closed behind Set up while it has no repository or token', () => {
    render(<Harness />)
    expect(card()).toHaveAttribute('data-state', 'empty')
    expect(within(card()).getByRole('heading', { name: 'Component to Storybook' })).toBeInTheDocument()
    expect(badge('Not set up')).toHaveAttribute('data-tone', 'neutral')
    expect(within(card()).getByText(GROUP_EMPTY_HINT)).toBeInTheDocument()
    expect(within(card()).queryByLabelText(REPO)).toBeNull()
    expect(within(card()).queryByLabelText(TOKEN)).toBeNull()
  })

  it('shows the fields after Set up, and the badge follows what is typed', () => {
    render(<Harness />)
    fireEvent.click(within(card()).getByRole('button', { name: 'Set up' }))
    expect(within(card()).queryByRole('button', { name: 'Set up' })).toBeNull()
    expect(within(card()).queryByText(GROUP_EMPTY_HINT)).toBeNull()
    expect(within(card()).getByText('Not set up')).toBeInTheDocument()
    expect(within(card()).getByLabelText('Output folder')).toHaveValue('src/components')

    fireEvent.input(within(card()).getByLabelText(REPO), { target: { value: 'acme/design-system' } })
    expect(badge('Incomplete')).toHaveAttribute('data-tone', 'warning')
    fireEvent.input(within(card()).getByLabelText(TOKEN), { target: { value: 'ghp_test' } })
    expect(badge('Configured')).toHaveAttribute('data-tone', 'success')
    expect(card()).toHaveAttribute('data-state', 'configured')
  })

  it('stays open once opened, even when both fields are emptied again', () => {
    render(<Harness />)
    fireEvent.click(within(card()).getByRole('button', { name: 'Set up' }))
    fireEvent.input(within(card()).getByLabelText(REPO), { target: { value: 'acme/ds' } })
    fireEvent.input(within(card()).getByLabelText(REPO), { target: { value: '' } })
    expect(within(card()).getByText('Not set up')).toBeInTheDocument()
    expect(within(card()).getByLabelText(REPO)).toBeInTheDocument()
  })

  it('opens on its own when either required key already has a value', () => {
    render(<Harness id="library" initial={{ libraryToken: 'ghp_l' }} />)
    const library = card('Library update to screens')
    expect(within(library).getByText('Incomplete')).toBeInTheDocument()
    expect(within(library).queryByRole('button', { name: 'Set up' })).toBeNull()
    expect(within(library).getByLabelText(REPO)).toHaveValue('')
    expect(within(library).getByLabelText(TOKEN)).toHaveValue('ghp_l')
  })

  it('masks the token, and lays a row out as a growing column beside the select column', () => {
    const { container } = render(<Harness initial={{ componentRepo: 'acme/ds', componentToken: 'ghp_c' }} />)
    expect(within(card()).getByLabelText(TOKEN)).toHaveAttribute('type', 'password')
    const rows = [...container.querySelectorAll('.bb-integrations__group-row')]
    expect(rows).toHaveLength(2)
    for (const row of rows) expect([...row.children].map((c) => c.className)).toEqual(['bb-integrations__group-main', 'bb-integrations__group-side'])
    expect(within(rows[0] as HTMLElement).getByLabelText(REPO)).toBeInTheDocument()
    expect(within(rows[0] as HTMLElement).getByText('Base branch')).toBeInTheDocument()
    expect(within(rows[1] as HTMLElement).getByText('Framework')).toBeInTheDocument()
    // The folder is not in a row: it takes the card's full width.
    expect(within(card()).getByLabelText('Output folder').closest('.bb-integrations__group-row')).toBeNull()
  })

  it('reports edits by key, the select included', () => {
    const onChange = vi.fn()
    render(<Harness id="screen" initial={{ screenRepo: 'acme/web' }} onChange={onChange} />)
    const screenCard = card('Screen to code')
    fireEvent.input(within(screenCard).getByLabelText('Design system package'), { target: { value: '@acme/ui' } })
    expect(onChange).toHaveBeenLastCalledWith('screenPackage', '@acme/ui')
    fireEvent.click(within(screenCard).getByRole('button', { name: /Framework/ }))
    fireEvent.click(within(screenCard).getByRole('option', { name: 'Vue + TypeScript' }))
    expect(onChange).toHaveBeenLastCalledWith('screenFramework', 'Vue + TypeScript')
    expect(within(screenCard).getByText('Screens import components from this package instead of copying them.')).toBeInTheDocument()
  })

  it('keeps a locked key disabled and leaves the others editable', () => {
    render(<Harness initial={{ componentRepo: 'acme/design-system' }} locked={['componentRepo', 'componentBranch']} />)
    expect(within(card()).getByText('Incomplete')).toBeInTheDocument()
    expect(within(card()).getByLabelText(REPO)).toBeDisabled()
    expect(within(card()).getByRole('button', { name: /Base branch/ })).toBeDisabled()
    expect(within(card()).getByLabelText(TOKEN)).toBeEnabled()
    expect(within(card()).getByLabelText('Output folder')).toBeEnabled()
  })

  it('disables Set up and every field while the section is saving', () => {
    const { unmount } = render(<Harness disabled />)
    expect(within(card()).getByRole('button', { name: 'Set up' })).toBeDisabled()
    unmount()
    render(<Harness disabled initial={{ componentRepo: 'acme/ds', componentToken: 'ghp_c' }} />)
    for (const label of [REPO, TOKEN, 'Output folder']) expect(within(card()).getByLabelText(label)).toBeDisabled()
  })

  it('shows a field error under its field, and opens a closed group that has one', () => {
    render(<Harness errors={{ componentFolder: 'Use a folder inside the repository, e.g. .bluebird/history' }} />)
    expect(within(card()).getByText('Not set up')).toBeInTheDocument()
    expect(within(card()).queryByRole('button', { name: 'Set up' })).toBeNull()
    expect(within(card()).getByText('Use a folder inside the repository, e.g. .bluebird/history')).toBeInTheDocument()
    expect(within(card()).getByLabelText('Output folder')).toHaveAttribute('aria-invalid', 'true')
  })

  it('ignores another group’s error', () => {
    render(<Harness errors={{ screenRepo: 'Use the owner/repository format' }} />)
    expect(within(card()).getByRole('button', { name: 'Set up' })).toBeInTheDocument()
  })
})
