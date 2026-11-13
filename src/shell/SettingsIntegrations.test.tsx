import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/preact'
import { DEFAULT_INTEGRATIONS, type IntegrationSettings } from '@shared/integrations'
import { SettingsIntegrations } from './SettingsIntegrations'
import { TEST_UNAVAILABLE } from './integrations/IntegrationSection'
import type { IntegrationsApi } from './integrations/client'

function fakeApi(settings: IntegrationSettings = DEFAULT_INTEGRATIONS, save: IntegrationsApi['save'] = async (_s, v) => v): IntegrationsApi & { save: ReturnType<typeof vi.fn> } {
  return { load: async () => settings, save: vi.fn(save) }
}
/** Finds a section and opens it, as a person would before reaching its fields. */
const section = async (name: string) => {
  const region = await screen.findByRole('region', { name })
  const arrow = within(region).getByRole('button', { name: new RegExp(`(Show|Hide) ${name.replace(/[()+]/g, '\\$&')} settings`) })
  if (arrow.getAttribute('aria-expanded') === 'false') fireEvent.click(arrow)
  await within(region).findByRole('button', { name: /Hide .* settings/ })
  return region
}

describe('SettingsIntegrations', () => {
  it('renders the Figma sections, plus Storage, in order once the settings load', async () => {
    const { container } = render(<SettingsIntegrations api={fakeApi()} />)
    await section('Jira integration')
    expect([...container.querySelectorAll('.bb-integrations__section')].map((s) => s.getAttribute('aria-label'))).toEqual([
      'GitHub output configuration', 'Storage', 'Notifications', 'Storybook', 'Zeroheight', 'Dual File Mode', 'AI agent assistance (UXAI)', 'MCP + code sync', 'Jira integration',
    ])
  })

  it('starts collapsed, with each section’s status and an arrow', async () => {
    render(<SettingsIntegrations api={fakeApi({ ...DEFAULT_INTEGRATIONS, github: { ...DEFAULT_INTEGRATIONS.github, apiKey: 'k', repo: 'a/b' } })} />)
    const github = await screen.findByRole('region', { name: 'GitHub output configuration' })
    expect(within(github).getByText('Configured')).toBeInTheDocument()
    expect(within(github).queryByLabelText('Repository (owner/repo)')).toBeNull()
    expect(within(github).getByRole('button', { name: 'Show GitHub output configuration settings' })).toHaveAttribute('aria-expanded', 'false')
    expect(within(screen.getByRole('region', { name: 'Storybook' })).getByText('Not configured')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Jira integration' })).getByText('Off')).toBeInTheDocument()
  })

  it('opens and closes from the arrow or anywhere on the header', async () => {
    render(<SettingsIntegrations api={fakeApi()} />)
    const github = await screen.findByRole('region', { name: 'GitHub output configuration' })
    fireEvent.click(within(github).getByRole('button', { name: 'Show GitHub output configuration settings' }))
    expect(await within(github).findByLabelText('Repository (owner/repo)')).toBeInTheDocument()
    fireEvent.click(within(github).getByRole('heading', { name: 'GitHub output configuration' }))
    await waitFor(() => expect(within(github).queryByLabelText('Repository (owner/repo)')).toBeNull())
  })

  it('keeps what was typed when a section is closed and reopened', async () => {
    render(<SettingsIntegrations api={fakeApi()} />)
    const github = await section('GitHub output configuration')
    fireEvent.input(within(github).getByLabelText('Repository (owner/repo)'), { target: { value: 'a/b' } })
    fireEvent.click(within(github).getByRole('button', { name: 'Hide GitHub output configuration settings' }))
    fireEvent.click(await within(github).findByRole('button', { name: 'Show GitHub output configuration settings' }))
    expect((await within(github).findByLabelText('Repository (owner/repo)') as HTMLInputElement).value).toBe('a/b')
  })

  it('updates the status on save, not while typing', async () => {
    render(<SettingsIntegrations api={fakeApi()} />)
    const storybook = await section('Storybook')
    fireEvent.input(within(storybook).getByLabelText(/Base URL/), { target: { value: 'https://sb.example.com' } })
    expect(within(storybook).getByText('Not configured')).toBeInTheDocument()
    fireEvent.click(within(storybook).getByRole('button', { name: 'Save configuration' }))
    expect(await within(storybook).findByText('Configured')).toBeInTheDocument()
  })

  it('does not close when the header switch is flipped', async () => {
    render(<SettingsIntegrations api={fakeApi()} />)
    const jira = await section('Jira integration')
    fireEvent.click(within(jira).getByRole('switch', { name: 'Jira integration' }))
    expect(within(jira).getByRole('button', { name: 'Hide Jira integration settings' })).toBeInTheDocument()
  })

  it('shows stored values and the header switch state', async () => {
    render(<SettingsIntegrations api={fakeApi({ ...DEFAULT_INTEGRATIONS, jira: { ...DEFAULT_INTEGRATIONS.jira, enabled: true, projectKey: 'DS' } })} />)
    const jira = await section('Jira integration')
    expect((within(jira).getByLabelText('Project key') as HTMLInputElement).value).toBe('DS')
    expect(within(jira).getByRole('switch', { name: 'Jira integration' })).toHaveAttribute('aria-checked', 'true')
  })

  it('masks secret fields behind the eye toggle', async () => {
    render(<SettingsIntegrations api={fakeApi()} />)
    const ai = await section('AI agent assistance (UXAI)')
    expect((within(ai).getByLabelText('Claude API key') as HTMLInputElement).type).toBe('password')
    expect((within(ai).getByLabelText('Custom instructions (optional)') as HTMLElement).tagName).toBe('TEXTAREA')
  })

  it('saves only its own section, with the edited values and switches', async () => {
    const api = fakeApi()
    render(<SettingsIntegrations api={api} />)
    const github = await section('GitHub output configuration')
    fireEvent.input(within(github).getByLabelText('Repository (owner/repo)'), { target: { value: 'gap-inc/design-tokens' } })
    fireEvent.click(within(github).getByRole('switch', { name: 'Enable diff comparison' }))
    fireEvent.click(within(github).getByRole('button', { name: 'Save configuration' }))
    await within(github).findByText('Saved')
    expect(api.save).toHaveBeenCalledTimes(1)
    expect(api.save).toHaveBeenCalledWith('github', { ...DEFAULT_INTEGRATIONS.github, repo: 'gap-inc/design-tokens', diffComparison: false })
  })

  it('flags invalid fields inline and does not save', async () => {
    const api = fakeApi()
    render(<SettingsIntegrations api={api} />)
    const github = await section('GitHub output configuration')
    const repo = within(github).getByLabelText('Repository (owner/repo)')
    fireEvent.input(repo, { target: { value: 'design-tokens' } })
    fireEvent.click(within(github).getByRole('button', { name: 'Save configuration' }))
    expect(await within(github).findByText('Check the highlighted fields')).toBeInTheDocument()
    expect(repo).toHaveAttribute('aria-invalid', 'true')
    expect(repo).toHaveAccessibleDescription(expect.stringContaining('owner/repository'))
    expect(api.save).not.toHaveBeenCalled()
  })

  it('reports a save the store refused', async () => {
    render(<SettingsIntegrations api={fakeApi(DEFAULT_INTEGRATIONS, async () => { throw new Error('Disk full') })} />)
    const storybook = await section('Storybook')
    fireEvent.click(within(storybook).getByRole('button', { name: 'Save configuration' }))
    expect(await within(storybook).findByRole('alert')).toHaveTextContent('Disk full')
  })

  it('says plainly that Test connection is not wired yet', async () => {
    const api = fakeApi()
    render(<SettingsIntegrations api={api} />)
    const zeroheight = await section('Zeroheight')
    fireEvent.click(within(zeroheight).getByRole('button', { name: 'Test connection' }))
    expect(within(zeroheight).getByText(TEST_UNAVAILABLE)).toBeInTheDocument()
    expect(api.save).not.toHaveBeenCalled()
  })

  describe('Jira Test connection', () => {
    const jira = { ...DEFAULT_INTEGRATIONS.jira, email: 'me@acme.com', apiKey: 'tok', siteUrl: 'https://team.atlassian.net', proxyUrl: 'http://localhost:8787' }
    const withJira = { ...DEFAULT_INTEGRATIONS, jira }

    it('tests the typed values without saving and reports who it signed in as', async () => {
      const test = vi.fn(async () => ({ message: 'Connected to team.atlassian.net through the proxy as Praveen Manchi.' }))
      const api = { ...fakeApi(withJira), test }
      render(<SettingsIntegrations api={api} />)
      const section_ = await section('Jira integration')
      fireEvent.input(within(section_).getByLabelText('Project key'), { target: { value: 'DS' } })
      fireEvent.click(within(section_).getByRole('button', { name: 'Test connection' }))
      expect(await within(section_).findByText(/Connected to team\.atlassian\.net through the proxy as Praveen Manchi\./)).toBeInTheDocument()
      expect(within(section_).getByText('Connection works')).toBeInTheDocument()
      expect(test).toHaveBeenCalledWith('jira', expect.objectContaining({ projectKey: 'DS', siteUrl: 'https://team.atlassian.net' }))
      expect(api.save).not.toHaveBeenCalled()
    })

    it('shows why the connection failed', async () => {
      const api = { ...fakeApi(withJira), test: vi.fn(async () => { throw new Error('Jira rejected the email or API token.') }) }
      render(<SettingsIntegrations api={api} />)
      const section_ = await section('Jira integration')
      fireEvent.click(within(section_).getByRole('button', { name: 'Test connection' }))
      expect(await within(section_).findByRole('alert')).toHaveTextContent('Connection failed')
      expect(within(section_).getByRole('alert')).toHaveTextContent('Jira rejected the email or API token.')
    })

    it('checks the fields first and sends nothing when they are wrong', async () => {
      const api = { ...fakeApi({ ...DEFAULT_INTEGRATIONS, jira: { ...jira, siteUrl: 'https://evil.example.com' } }), test: vi.fn() }
      render(<SettingsIntegrations api={api} />)
      const section_ = await section('Jira integration')
      fireEvent.click(within(section_).getByRole('button', { name: 'Test connection' }))
      expect(await within(section_).findByText('Check the highlighted fields')).toBeInTheDocument()
      expect(api.test).not.toHaveBeenCalled()
    })

    it('keeps the not-wired notice for sections without a test', async () => {
      const api = { ...fakeApi(), test: vi.fn() }
      render(<SettingsIntegrations api={api} />)
      const zeroheight = await section('Zeroheight')
      fireEvent.click(within(zeroheight).getByRole('button', { name: 'Test connection' }))
      expect(within(zeroheight).getByText(TEST_UNAVAILABLE)).toBeInTheDocument()
      expect(api.test).not.toHaveBeenCalled()
    })
  })

  describe('Dual File Mode', () => {
    it('offers what each file contains and saves a pasted URL as its file ID', async () => {
      const api = fakeApi()
      render(<SettingsIntegrations api={api} />)
      const dual = await section('Dual File Mode')
      fireEvent.input(within(dual).getByLabelText('File 1 ID'), { target: { value: 'https://www.figma.com/design/JPZ7koqomjcjczGQuhIMVH/Plugin-UI?node-id=0-1' } })
      fireEvent.input(within(dual).getByLabelText('File 1 API key'), { target: { value: 'figd_test' } })
      fireEvent.click(within(dual).getByRole('button', { name: /File 1 contains/ }))
      expect(within(dual).getAllByRole('option').map((o) => o.textContent)).toEqual(['Variables', 'Components', 'Variables + Components'])
      fireEvent.click(within(dual).getByRole('option', { name: 'Variables + Components' }))
      fireEvent.click(within(dual).getByRole('button', { name: 'Save configuration' }))
      await within(dual).findByText('Saved')
      expect(api.save).toHaveBeenCalledWith('dualFile', { ...DEFAULT_INTEGRATIONS.dualFile, file1Id: 'JPZ7koqomjcjczGQuhIMVH', file1Key: 'figd_test', file1Role: 'Variables + Components' })
    })

    it('adds, fills, validates and removes extra library files', async () => {
      const api = fakeApi()
      render(<SettingsIntegrations api={api} />)
      const dual = await section('Dual File Mode')
      fireEvent.click(within(dual).getByRole('button', { name: 'Add another library file' }))
      fireEvent.input(within(dual).getByLabelText('File 3 ID'), { target: { value: 'https://www.figma.com/design/ICONS3/Icons' } })
      fireEvent.click(within(dual).getByRole('button', { name: 'Save configuration' }))
      expect(await within(dual).findByText('Check the highlighted fields')).toBeInTheDocument()
      expect(within(dual).getByLabelText('File 3 API key')).toHaveAccessibleDescription(expect.stringContaining('File 3'))
      fireEvent.input(within(dual).getByLabelText('File 1 ID'), { target: { value: 'VARS1' } })
      fireEvent.input(within(dual).getByLabelText('File 1 API key'), { target: { value: 'figd_test' } })
      fireEvent.click(within(dual).getByRole('button', { name: 'Add another library file' }))
      fireEvent.click(within(dual).getByRole('button', { name: 'Remove File 4' }))
      fireEvent.click(within(dual).getByRole('button', { name: 'Save configuration' }))
      await within(dual).findByText('Saved')
      expect(api.save).toHaveBeenCalledWith('dualFile', expect.objectContaining({ file1Id: 'VARS1', extraFiles: [{ id: 'ICONS3', key: '', role: 'Components' }] }))
    })

    it('asks for the key a file needs before saving', async () => {
      const api = fakeApi()
      render(<SettingsIntegrations api={api} />)
      const dual = await section('Dual File Mode')
      fireEvent.input(within(dual).getByLabelText('File 2 ID'), { target: { value: 'COMP2' } })
      fireEvent.click(within(dual).getByRole('button', { name: 'Save configuration' }))
      expect(await within(dual).findByText('Check the highlighted fields')).toBeInTheDocument()
      expect(within(dual).getByLabelText('File 2 API key')).toHaveAccessibleDescription(expect.stringContaining('API key'))
      expect(api.save).not.toHaveBeenCalled()
    })

    it('tests the typed files against Figma and reports what each holds', async () => {
      const test = vi.fn(async () => ({ message: 'File 1 “Brand UI”: 1,026 variables in 3 collections.' }))
      const api = { ...fakeApi(), test }
      render(<SettingsIntegrations api={api} />)
      const dual = await section('Dual File Mode')
      fireEvent.input(within(dual).getByLabelText('File 1 ID'), { target: { value: 'VARS1' } })
      fireEvent.input(within(dual).getByLabelText('File 1 API key'), { target: { value: 'figd_test' } })
      fireEvent.click(within(dual).getByRole('button', { name: 'Test connection' }))
      expect(await within(dual).findByText(/1,026 variables in 3 collections/)).toBeInTheDocument()
      expect(test).toHaveBeenCalledWith('dualFile', expect.objectContaining({ file1Id: 'VARS1', file1Role: 'Variables' }))
    })
  })

  it('picks a model from the dropdown', async () => {
    const api = fakeApi()
    render(<SettingsIntegrations api={api} />)
    const ai = await section('AI agent assistance (UXAI)')
    fireEvent.click(within(ai).getAllByRole('button', { name: /Default model/ })[1]!)
    fireEvent.click(within(ai).getByText('gpt-4.1'))
    fireEvent.click(within(ai).getByRole('button', { name: 'Save configuration' }))
    await waitFor(() => expect(api.save).toHaveBeenCalledWith('ai', expect.objectContaining({ openaiModel: 'gpt-4.1' })))
  })

  it('explains a failed load', async () => {
    render(<SettingsIntegrations api={{ load: async () => { throw new Error('Storage unavailable') }, save: async (_s, v) => v }} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Storage unavailable')
  })

  it('trims pasted values before saving and shows what was stored', async () => {
    const api = fakeApi()
    render(<SettingsIntegrations api={api} />)
    const github = await section('GitHub output configuration')
    const repo = within(github).getByLabelText('Repository (owner/repo)') as HTMLInputElement
    fireEvent.input(repo, { target: { value: '  gap-inc/design-tokens  ' } })
    fireEvent.click(within(github).getByRole('button', { name: 'Save configuration' }))
    await within(github).findByText('Saved')
    expect(api.save).toHaveBeenCalledWith('github', expect.objectContaining({ repo: 'gap-inc/design-tokens' }))
    expect(repo.value).toBe('gap-inc/design-tokens')
  })

  it('runs the model dropdown from the keyboard and returns focus to the trigger', async () => {
    render(<SettingsIntegrations api={fakeApi()} />)
    const ai = await section('AI agent assistance (UXAI)')
    const trigger = within(ai).getAllByRole('button', { name: /Default model/ })[0]!
    fireEvent.click(trigger)
    const listbox = within(ai).getByRole('listbox', { name: 'Default model' })
    expect(document.activeElement).toBe(within(listbox).getByRole('option', { name: /claude-opus-5-5/ }))
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(within(listbox).getByRole('option', { name: /claude-sonnet-5-5/ }))
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(within(ai).queryByRole('listbox')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  describe('brand-managed sections', () => {
    it('locks the managed fields, keeps keys editable and says who set them', async () => {
      render(<SettingsIntegrations api={fakeApi({ ...DEFAULT_INTEGRATIONS, github: { ...DEFAULT_INTEGRATIONS.github, repo: 'ikea/tokens' } })} managed={{ github: { repo: 'ikea/tokens', baseUrl: '' } }} managedBy="Ikea" />)
      const github = await section('GitHub output configuration')
      expect(within(github).getByText('Set by Ikea')).toBeInTheDocument()
      expect(within(github).getByLabelText('Repository (owner/repo)')).toBeDisabled()
      expect(within(github).getByLabelText('API key')).not.toBeDisabled()
      expect(within(github).getByRole('button', { name: 'Save configuration' })).toBeInTheDocument()
    })

    it('drops Save when the brand set everything, and locks a managed header switch', async () => {
      render(<SettingsIntegrations api={fakeApi()} managed={{ storybook: { baseUrl: '', storyPathTemplate: '', indexUrl: '', linksEnabled: true }, jira: { enabled: false } }} managedBy="Ikea" />)
      const storybook = await section('Storybook')
      expect(within(storybook).queryByRole('button', { name: 'Save configuration' })).toBeNull()
      expect(within(await section('Jira integration')).getByRole('switch', { name: 'Jira integration' })).toBeDisabled()
      expect(within(await section('Notifications')).queryByText(/Set by/)).toBeNull()
    })
  })
})

describe('SettingsIntegrations team setup file', () => {
  it('shows what an imported file set in the sections above it', async () => {
    const imported: IntegrationSettings = { ...DEFAULT_INTEGRATIONS, storybook: { ...DEFAULT_INTEGRATIONS.storybook, baseUrl: 'https://ds.acme.com/storybook' } }
    const api: IntegrationsApi = { ...fakeApi(), importFile: vi.fn(async () => imported) }
    render(<SettingsIntegrations api={api} brandId="bridge" managedBy="Bridge" />)
    const storybook = await screen.findByRole('region', { name: 'Storybook' })
    expect(within(storybook).getByText('Not configured')).toBeInTheDocument()
    const text = JSON.stringify({ kind: 'bluebird-settings', version: 1, includesKeys: true, sections: { storybook: { baseUrl: 'https://ds.acme.com/storybook' } } })
    fireEvent.change(screen.getByLabelText('Settings file'), { target: { files: [{ name: 'bridge-settings.json', size: text.length, text: async () => text }] } })
    fireEvent.click(await screen.findByRole('button', { name: 'Apply settings' }))
    await waitFor(() => expect(within(screen.getByRole('region', { name: 'Storybook' })).getByText('Configured')).toBeInTheDocument())
    expect(within(screen.getByRole('region', { name: 'Team setup file' })).getByText('Settings imported')).toBeInTheDocument()
  })
})
