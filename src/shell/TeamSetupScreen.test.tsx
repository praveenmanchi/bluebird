import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/preact'
import { DEFAULT_INTEGRATIONS, type IntegrationSettings } from '@shared/integrations'
import { TeamSetupScreen } from './TeamSetupScreen'

const FILE = JSON.stringify({ kind: 'bluebird-settings', version: 1, brand: 'Bridge', includesKeys: true, sections: { github: { apiKey: 'ghp_team', repo: 'acme/tokens' }, dualFile: { files: [{ name: 'Core', id: 'AbC123', role: 'Variables + Components' }] } } })
// jsdom's File has no text(); the picker only needs name, size and text.
const fileOf = (text: string, name = 'bridge-settings.json') => ({ name, size: text.length, text: async () => text }) as unknown as File
const pick = (file: File) => fireEvent.change(screen.getByLabelText('Settings file'), { target: { files: [file] } })
const title = () => screen.getByRole('heading', { level: 2 }).textContent

function setup(importFile = vi.fn(async (): Promise<IntegrationSettings> => ({
  ...DEFAULT_INTEGRATIONS,
  github: { ...DEFAULT_INTEGRATIONS.github, apiKey: 'ghp_team', repo: 'acme/tokens' },
  dualFile: { ...DEFAULT_INTEGRATIONS.dualFile, files: [{ name: 'Core', id: 'AbC123', role: 'Variables + Components' }] },
}))) {
  const onFinish = vi.fn()
  render(<TeamSetupScreen load={async () => DEFAULT_INTEGRATIONS} importFile={importFile} onFinish={onFinish} />)
  return { onFinish, importFile }
}

describe('TeamSetupScreen', () => {
  it('is its own screen: a title, a drop zone and Skip for now, with no tour steps', () => {
    const { onFinish, importFile } = setup()
    expect(screen.getByRole('region', { name: 'Team setup' })).toBeInTheDocument()
    expect(title()).toBe('Set up from your team’s file')
    expect(screen.getByText('Team setup · optional')).toBeInTheDocument()
    expect(screen.getByText('Drop your team settings file here')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Step \d/ })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }))
    expect(onFinish).toHaveBeenCalledTimes(1)
    expect(importFile).not.toHaveBeenCalled()
  })

  it('reviews the chosen file, applies it keeping existing values, and finishes from the confirmation', async () => {
    const { onFinish, importFile } = setup()
    pick(fileOf(FILE))
    expect(await screen.findByText('This file sets up 2 connections')).toBeInTheDocument()
    expect(title()).toBe('Check what will be set up')
    fireEvent.click(screen.getByRole('button', { name: 'Apply and finish' }))
    expect(await screen.findByText('Settings imported')).toBeInTheDocument()
    expect(importFile).toHaveBeenCalledWith(JSON.parse(FILE), true)
    expect(title()).toBe('You’re set up')
    expect(screen.getByText('Ready to use')).toBeInTheDocument()
    expect(screen.getByText('Still needs you')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Skip for now' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Get started' }))
    expect(onFinish).toHaveBeenCalledTimes(1)
  })

  it('explains a file that is not a settings file and offers another try', async () => {
    setup()
    pick(fileOf('{"notes":1}', 'team-notes.json'))
    expect(await screen.findByText('This file can’t be imported')).toBeInTheDocument()
    expect(title()).toBe('That file didn’t work')
    expect(screen.getAllByRole('button', { name: 'Choose another file' })).toHaveLength(2)
  })

  it('takes a dropped file, and keeps the review open when the store refuses it', async () => {
    setup(vi.fn(async () => { throw new Error('Use the owner/repository format') }))
    fireEvent.drop(screen.getByText('Drop your team settings file here').parentElement!, { dataTransfer: { files: [fileOf(FILE)] } })
    fireEvent.click(await screen.findByRole('button', { name: 'Apply and finish' }))
    expect(await screen.findByText('Use the owner/repository format')).toBeInTheDocument()
    expect(title()).toBe('Check what will be set up')
  })
})
