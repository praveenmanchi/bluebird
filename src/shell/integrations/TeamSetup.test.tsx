import { describe, it, expect, vi, afterEach } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/preact'
import { buildSettingsFile, serializeSettingsFile, DEFAULT_INTEGRATIONS, type IntegrationSettings } from '@shared/integrations'
import { TeamSetup } from './TeamSetup'

const LEAD: IntegrationSettings = {
  ...DEFAULT_INTEGRATIONS,
  github: { ...DEFAULT_INTEGRATIONS.github, apiKey: 'ghp_team', repo: 'acme/design-tokens' },
  storybook: { ...DEFAULT_INTEGRATIONS.storybook, baseUrl: 'https://ds.acme.com/storybook' },
  dualFile: { ...DEFAULT_INTEGRATIONS.dualFile, token: 'figd_mine', files: [{ name: 'Core', id: 'AbC123', role: 'Variables + Components' }] },
}
// jsdom's File has no text(); the picker only needs name, size and text.
const fileOf = (text: string, name = 'bridge-settings.json') => ({ name, size: text.length, text: async () => text }) as unknown as File
const textOf = (blob: Blob) => new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsText(blob) })
const exported = () => fileOf(serializeSettingsFile(buildSettingsFile(LEAD, { sections: ['github', 'storybook', 'dualFile'], includeKeys: true, brand: 'Bridge' })))
const menu = (item: 'Import settings' | 'Export settings') => {
  fireEvent.click(screen.getByRole('button', { name: 'Import / export' }))
  fireEvent.click(screen.getByRole('option', { name: item }))
}
/** Opens the import pop-up and picks a file in it. */
const pick = (file: File) => {
  menu('Import settings')
  fireEvent.change(screen.getByLabelText('Settings file'), { target: { files: [file] } })
}

/** jsdom has no Blob URLs; give it them and catch what the download link carried. */
function captureDownload() {
  const blobs: Blob[] = []
  const create = vi.fn((blob: Blob) => { blobs.push(blob); return 'blob:x' })
  Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() })
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
  return { blobs, click }
}
afterEach(() => { vi.restoreAllMocks(); Reflect.deleteProperty(URL, 'createObjectURL'); Reflect.deleteProperty(URL, 'revokeObjectURL') })

describe('TeamSetup export', () => {
  it('offers the configured sections, with keys included by default, and saves the file', async () => {
    const { blobs } = captureDownload()
    render(<TeamSetup settings={LEAD} brandId="bridge" brandLabel="Bridge" importFile={vi.fn()} />)
    expect(screen.queryByRole('dialog')).toBeNull()
    menu('Export settings')
    expect(screen.getByRole('dialog', { name: 'Export settings' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Code repository' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Zeroheight' })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'Jira integration' })).toBeDisabled()
    expect(screen.getByRole('switch', { name: 'Include API keys and tokens' })).toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: /^Export \d+ sections$/ }))
    expect(await screen.findByText('Saved bridge-settings.json')).toBeInTheDocument()
    const file = JSON.parse(await textOf(blobs[0]!))
    expect(file.sections.github.apiKey).toBe('ghp_team')
    expect(JSON.stringify(file)).not.toContain('figd_mine')
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('leaves keys and unticked sections out when asked', async () => {
    const { blobs } = captureDownload()
    render(<TeamSetup settings={LEAD} />)
    // Without a store to import into there is no menu, just the export.
    expect(screen.queryByRole('button', { name: 'Import / export' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Export settings' }))
    fireEvent.click(screen.getByRole('switch', { name: 'Include API keys and tokens' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Storybook' }))
    fireEvent.click(screen.getByRole('button', { name: /^Export \d+ sections?$/ }))
    const file = JSON.parse(await textOf(blobs[0]!))
    expect(file.includesKeys).toBe(false)
    expect(file.sections).not.toHaveProperty('storybook')
    expect(file.sections.github).not.toHaveProperty('apiKey')
    expect(await screen.findByText(/API keys left out/)).toBeInTheDocument()
  })

  it('says so when the download is blocked, and Cancel or Escape closes the pop-up', () => {
    render(<TeamSetup settings={LEAD} importFile={vi.fn()} />)
    menu('Export settings')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    menu('Export settings')
    fireEvent.click(screen.getByRole('button', { name: /^Export \d/ }))
    expect(screen.getByText('The file couldn’t be saved')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(screen.getByText('What goes in the file')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('opens a menu with both actions that closes on Escape or a click elsewhere', () => {
    render(<TeamSetup settings={LEAD} importFile={vi.fn()} />)
    const button = screen.getByRole('button', { name: 'Import / export' })
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Import settings', 'Export settings'])
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('option')).toBeNull()
    fireEvent.click(button)
    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('option')).toBeNull()
  })
})

describe('TeamSetup import', () => {
  it('reviews the file, applies it and lists what still needs a key', async () => {
    const applied: IntegrationSettings = { ...LEAD, dualFile: { ...LEAD.dualFile, token: '' } }
    const importFile = vi.fn(async () => applied)
    const onImported = vi.fn()
    render(<TeamSetup settings={DEFAULT_INTEGRATIONS} importFile={importFile} onImported={onImported} />)
    menu('Import settings')
    expect(screen.getByRole('dialog', { name: 'Import settings' })).toBeInTheDocument()
    expect(screen.getByText('Drop your team settings file here')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Settings file'), { target: { files: [exported()] } })
    const rows = await screen.findByRole('list', { name: 'Sections in the file' })
    expect(within(rows).getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByText(/Bridge · 3 sections · API keys included/)).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Keep values I already entered' })).toBeChecked()
    fireEvent.click(screen.getByRole('switch', { name: 'Keep values I already entered' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply settings' }))
    expect(await screen.findByText('Settings imported')).toBeInTheDocument()
    expect(importFile).toHaveBeenCalledWith(expect.objectContaining({ kind: 'bluebird-settings' }), false)
    expect(onImported).toHaveBeenCalledWith(applied)
    expect(within(screen.getByRole('list', { name: 'Sections that still need you' })).getByText('Dual File Mode')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('rejects a file that is not a settings file and lets the person cancel', async () => {
    const importFile = vi.fn()
    render(<TeamSetup settings={DEFAULT_INTEGRATIONS} importFile={importFile} />)
    pick(fileOf('{"notes":true}', 'team-notes.json'))
    expect(await screen.findByText('This file can’t be imported')).toBeInTheDocument()
    expect(screen.getByText('team-notes.json')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Choose another file' })).toBeInTheDocument()
    fireEvent.drop(screen.getByText('Drop the right file here').parentElement!, { dataTransfer: { files: [exported()] } })
    expect(await screen.findByRole('button', { name: 'Apply settings' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(importFile).not.toHaveBeenCalled()
  })

  it('keeps the review open with the reason when the store refuses the file', async () => {
    render(<TeamSetup settings={DEFAULT_INTEGRATIONS} importFile={vi.fn(async () => { throw new Error('Use the owner/repository format') })} />)
    pick(exported())
    fireEvent.click(await screen.findByRole('button', { name: 'Apply settings' }))
    await waitFor(() => expect(screen.getByText('Use the owner/repository format')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Apply settings' })).toBeEnabled()
  })
})
