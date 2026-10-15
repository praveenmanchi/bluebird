import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/preact'
import { DEFAULT_INTEGRATIONS, type IntegrationSettings } from '@shared/integrations'
import { SettingsIntegrations } from './SettingsIntegrations'
import { TEST_UNAVAILABLE } from './integrations/IntegrationSection'
import type { IntegrationsApi } from './integrations/client'

function fakeApi(settings: IntegrationSettings = DEFAULT_INTEGRATIONS, save: IntegrationsApi['save'] = async (_s, v) => v): IntegrationsApi & { save: ReturnType<typeof vi.fn> } {
  return { load: async () => settings, save: vi.fn(save) }
}
const section = async (name: string) => screen.findByRole('region', { name })

describe('SettingsIntegrations', () => {
  it('renders the eight Figma sections in order once the settings load', async () => {
    const { container } = render(<SettingsIntegrations api={fakeApi()} />)
    await section('Jira Integration')
    expect([...container.querySelectorAll('.bb-integrations__section')].map((s) => s.getAttribute('aria-label'))).toEqual([
      'GitHub Output Configuration', 'Notifications', 'Storybook', 'Zeroheight', 'Dual File Mode', 'AI Agent Assistance (UXAI)', 'MCP + Code Sync', 'Jira Integration',
    ])
  })

  it('shows stored values and the header switch state', async () => {
    render(<SettingsIntegrations api={fakeApi({ ...DEFAULT_INTEGRATIONS, jira: { ...DEFAULT_INTEGRATIONS.jira, enabled: true, projectKey: 'DS' } })} />)
    const jira = await section('Jira Integration')
    expect((within(jira).getByLabelText('Project Key') as HTMLInputElement).value).toBe('DS')
    expect(within(jira).getByRole('switch', { name: 'Jira Integration' })).toHaveAttribute('aria-checked', 'true')
  })

  it('masks secret fields behind the eye toggle', async () => {
    render(<SettingsIntegrations api={fakeApi()} />)
    const ai = await section('AI Agent Assistance (UXAI)')
    expect((within(ai).getByLabelText('Claude API Key') as HTMLInputElement).type).toBe('password')
    expect((within(ai).getByLabelText('Custom Instructions (optional)') as HTMLElement).tagName).toBe('TEXTAREA')
  })

  it('saves only its own section, with the edited values and switches', async () => {
    const api = fakeApi()
    render(<SettingsIntegrations api={api} />)
    const github = await section('GitHub Output Configuration')
    fireEvent.input(within(github).getByLabelText('Repository (owner/repo)'), { target: { value: 'gap-inc/design-tokens' } })
    fireEvent.click(within(github).getByRole('switch', { name: 'Enable diff comparison' }))
    fireEvent.click(within(github).getByRole('button', { name: 'Save Configuration' }))
    await within(github).findByText('Saved')
    expect(api.save).toHaveBeenCalledTimes(1)
    expect(api.save).toHaveBeenCalledWith('github', { ...DEFAULT_INTEGRATIONS.github, repo: 'gap-inc/design-tokens', diffComparison: false })
  })

  it('flags invalid fields inline and does not save', async () => {
    const api = fakeApi()
    render(<SettingsIntegrations api={api} />)
    const github = await section('GitHub Output Configuration')
    const repo = within(github).getByLabelText('Repository (owner/repo)')
    fireEvent.input(repo, { target: { value: 'design-tokens' } })
    fireEvent.click(within(github).getByRole('button', { name: 'Save Configuration' }))
    expect(await within(github).findByText('Check the highlighted fields')).toBeInTheDocument()
    expect(repo).toHaveAttribute('aria-invalid', 'true')
    expect(repo).toHaveAccessibleDescription(expect.stringContaining('owner/repository'))
    expect(api.save).not.toHaveBeenCalled()
  })

  it('reports a save the store refused', async () => {
    render(<SettingsIntegrations api={fakeApi(DEFAULT_INTEGRATIONS, async () => { throw new Error('Disk full') })} />)
    const storybook = await section('Storybook')
    fireEvent.click(within(storybook).getByRole('button', { name: 'Save Configuration' }))
    expect(await within(storybook).findByRole('alert')).toHaveTextContent('Disk full')
  })

  it('says plainly that Test Connection is not wired yet', async () => {
    const api = fakeApi()
    render(<SettingsIntegrations api={api} />)
    const zeroheight = await section('Zeroheight')
    fireEvent.click(within(zeroheight).getByRole('button', { name: 'Test Connection' }))
    expect(within(zeroheight).getByText(TEST_UNAVAILABLE)).toBeInTheDocument()
    expect(api.save).not.toHaveBeenCalled()
  })

  describe('Jira Test Connection', () => {
    const jira = { ...DEFAULT_INTEGRATIONS.jira, email: 'me@acme.com', apiKey: 'tok', siteUrl: 'https://team.atlassian.net', proxyUrl: 'http://localhost:8787' }
    const withJira = { ...DEFAULT_INTEGRATIONS, jira }

    it('tests the typed values without saving and reports who it signed in as', async () => {
      const test = vi.fn(async () => ({ message: 'Connected to team.atlassian.net through the proxy as Praveen Manchi.' }))
      const api = { ...fakeApi(withJira), test }
      render(<SettingsIntegrations api={api} />)
      const section_ = await section('Jira Integration')
      fireEvent.input(within(section_).getByLabelText('Project Key'), { target: { value: 'DS' } })
      fireEvent.click(within(section_).getByRole('button', { name: 'Test Connection' }))
      expect(await within(section_).findByText(/Connected to team\.atlassian\.net through the proxy as Praveen Manchi\./)).toBeInTheDocument()
      expect(within(section_).getByText('Connection works')).toBeInTheDocument()
      expect(test).toHaveBeenCalledWith('jira', expect.objectContaining({ projectKey: 'DS', siteUrl: 'https://team.atlassian.net' }))
      expect(api.save).not.toHaveBeenCalled()
    })

    it('shows why the connection failed', async () => {
      const api = { ...fakeApi(withJira), test: vi.fn(async () => { throw new Error('Jira rejected the email or API token.') }) }
      render(<SettingsIntegrations api={api} />)
      const section_ = await section('Jira Integration')
      fireEvent.click(within(section_).getByRole('button', { name: 'Test Connection' }))
      expect(await within(section_).findByRole('alert')).toHaveTextContent('Connection failed')
      expect(within(section_).getByRole('alert')).toHaveTextContent('Jira rejected the email or API token.')
    })

    it('checks the fields first and sends nothing when they are wrong', async () => {
      const api = { ...fakeApi({ ...DEFAULT_INTEGRATIONS, jira: { ...jira, siteUrl: 'https://evil.example.com' } }), test: vi.fn() }
      render(<SettingsIntegrations api={api} />)
      const section_ = await section('Jira Integration')
      fireEvent.click(within(section_).getByRole('button', { name: 'Test Connection' }))
      expect(await within(section_).findByText('Check the highlighted fields')).toBeInTheDocument()
      expect(api.test).not.toHaveBeenCalled()
    })

    it('keeps the not-wired notice for sections without a test', async () => {
      const api = { ...fakeApi(), test: vi.fn() }
      render(<SettingsIntegrations api={api} />)
      const zeroheight = await section('Zeroheight')
      fireEvent.click(within(zeroheight).getByRole('button', { name: 'Test Connection' }))
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
      fireEvent.input(within(dual).getByLabelText('File 1 API Key'), { target: { value: 'figd_test' } })
      fireEvent.click(within(dual).getByRole('button', { name: /File 1 contains/ }))
      expect(within(dual).getAllByRole('option').map((o) => o.textContent)).toEqual(['Variables', 'Components', 'Variables + Components'])
      fireEvent.click(within(dual).getByRole('option', { name: 'Variables + Components' }))
      fireEvent.click(within(dual).getByRole('button', { name: 'Save Configuration' }))
      await within(dual).findByText('Saved')
      expect(api.save).toHaveBeenCalledWith('dualFile', { ...DEFAULT_INTEGRATIONS.dualFile, file1Id: 'JPZ7koqomjcjczGQuhIMVH', file1Key: 'figd_test', file1Role: 'Variables + Components' })
    })

    it('adds, fills, validates and removes extra library files', async () => {
      const api = fakeApi()
      render(<SettingsIntegrations api={api} />)
      const dual = await section('Dual File Mode')
      fireEvent.click(within(dual).getByRole('button', { name: 'Add another library file' }))
      fireEvent.input(within(dual).getByLabelText('File 3 ID'), { target: { value: 'https://www.figma.com/design/ICONS3/Icons' } })
      fireEvent.click(within(dual).getByRole('button', { name: 'Save Configuration' }))
      expect(await within(dual).findByText('Check the highlighted fields')).toBeInTheDocument()
      expect(within(dual).getByLabelText('File 3 API Key')).toHaveAccessibleDescription(expect.stringContaining('File 3'))
      fireEvent.input(within(dual).getByLabelText('File 1 ID'), { target: { value: 'VARS1' } })
      fireEvent.input(within(dual).getByLabelText('File 1 API Key'), { target: { value: 'figd_test' } })
      fireEvent.click(within(dual).getByRole('button', { name: 'Add another library file' }))
      fireEvent.click(within(dual).getByRole('button', { name: 'Remove File 4' }))
      fireEvent.click(within(dual).getByRole('button', { name: 'Save Configuration' }))
      await within(dual).findByText('Saved')
      expect(api.save).toHaveBeenCalledWith('dualFile', expect.objectContaining({ file1Id: 'VARS1', extraFiles: [{ id: 'ICONS3', key: '', role: 'Components' }] }))
    })

    it('asks for the key a file needs before saving', async () => {
      const api = fakeApi()
      render(<SettingsIntegrations api={api} />)
      const dual = await section('Dual File Mode')
      fireEvent.input(within(dual).getByLabelText('File 2 ID'), { target: { value: 'COMP2' } })
      fireEvent.click(within(dual).getByRole('button', { name: 'Save Configuration' }))
      expect(await within(dual).findByText('Check the highlighted fields')).toBeInTheDocument()
      expect(within(dual).getByLabelText('File 2 API Key')).toHaveAccessibleDescription(expect.stringContaining('API key'))
      expect(api.save).not.toHaveBeenCalled()
    })

    it('tests the typed files against Figma and reports what each holds', async () => {
      const test = vi.fn(async () => ({ message: 'File 1 “Brand UI”: 421 variables in 3 collections.' }))
      const api = { ...fakeApi(), test }
      render(<SettingsIntegrations api={api} />)
      const dual = await section('Dual File Mode')
      fireEvent.input(within(dual).getByLabelText('File 1 ID'), { target: { value: 'VARS1' } })
      fireEvent.input(within(dual).getByLabelText('File 1 API Key'), { target: { value: 'figd_test' } })
      fireEvent.click(within(dual).getByRole('button', { name: 'Test Connection' }))
      expect(await within(dual).findByText(/421 variables in 3 collections/)).toBeInTheDocument()
      expect(test).toHaveBeenCalledWith('dualFile', expect.objectContaining({ file1Id: 'VARS1', file1Role: 'Variables' }))
    })
  })

  it('picks a model from the dropdown', async () => {
    const api = fakeApi()
    render(<SettingsIntegrations api={api} />)
    const ai = await section('AI Agent Assistance (UXAI)')
    fireEvent.click(within(ai).getAllByRole('button', { name: /Default Model/ })[1]!)
    fireEvent.click(within(ai).getByText('gpt-4.1'))
    fireEvent.click(within(ai).getByRole('button', { name: 'Save Configuration' }))
    await waitFor(() => expect(api.save).toHaveBeenCalledWith('ai', expect.objectContaining({ openaiModel: 'gpt-4.1' })))
  })

  it('explains a failed load', async () => {
    render(<SettingsIntegrations api={{ load: async () => { throw new Error('Storage unavailable') }, save: async (_s, v) => v }} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Storage unavailable')
  })

  it('trims pasted values before saving and shows what was stored', async () => {
    const api = fakeApi()
    render(<SettingsIntegrations api={api} />)
    const github = await section('GitHub Output Configuration')
    const repo = within(github).getByLabelText('Repository (owner/repo)') as HTMLInputElement
    fireEvent.input(repo, { target: { value: '  gap-inc/design-tokens  ' } })
    fireEvent.click(within(github).getByRole('button', { name: 'Save Configuration' }))
    await within(github).findByText('Saved')
    expect(api.save).toHaveBeenCalledWith('github', expect.objectContaining({ repo: 'gap-inc/design-tokens' }))
    expect(repo.value).toBe('gap-inc/design-tokens')
  })

  it('runs the model dropdown from the keyboard and returns focus to the trigger', async () => {
    render(<SettingsIntegrations api={fakeApi()} />)
    const ai = await section('AI Agent Assistance (UXAI)')
    const trigger = within(ai).getAllByRole('button', { name: /Default Model/ })[0]!
    fireEvent.click(trigger)
    const listbox = within(ai).getByRole('listbox', { name: 'Default Model' })
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
      const github = await section('GitHub Output Configuration')
      expect(within(github).getByText('Set by Ikea')).toBeInTheDocument()
      expect(within(github).getByLabelText('Repository (owner/repo)')).toBeDisabled()
      expect(within(github).getByLabelText('API key')).not.toBeDisabled()
      expect(within(github).getByRole('button', { name: 'Save Configuration' })).toBeInTheDocument()
    })

    it('drops Save when the brand set everything, and locks a managed header switch', async () => {
      render(<SettingsIntegrations api={fakeApi()} managed={{ storybook: { baseUrl: '', storyPathTemplate: '', indexUrl: '', linksEnabled: true }, jira: { enabled: false } }} managedBy="Ikea" />)
      const storybook = await section('Storybook')
      expect(within(storybook).queryByRole('button', { name: 'Save Configuration' })).toBeNull()
      expect(within(await section('Jira Integration')).getByRole('switch', { name: 'Jira Integration' })).toBeDisabled()
      expect(within(await section('Notifications')).queryByText(/Set by/)).toBeNull()
    })
  })
})
