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
      'Code repository', 'Storage', 'Notifications', 'Storybook', 'Zeroheight', 'Dual File Mode', 'AI agent assistance (UXAI)', 'MCP + code sync', 'Jira integration',
    ])
  })

  it('starts collapsed, with each section’s status and an arrow', async () => {
    render(<SettingsIntegrations api={fakeApi({ ...DEFAULT_INTEGRATIONS, github: { ...DEFAULT_INTEGRATIONS.github, apiKey: 'k', repo: 'a/b' } })} />)
    const github = await screen.findByRole('region', { name: 'Code repository' })
    expect(within(github).getByText('Configured')).toBeInTheDocument()
    expect(within(github).queryByLabelText('Repository (owner/repo)')).toBeNull()
    expect(within(github).getByRole('button', { name: 'Show Code repository settings' })).toHaveAttribute('aria-expanded', 'false')
    expect(within(screen.getByRole('region', { name: 'Storybook' })).getByText('Not configured')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Jira integration' })).getByText('Off')).toBeInTheDocument()
  })

  it('opens and closes from the arrow or anywhere on the header', async () => {
    render(<SettingsIntegrations api={fakeApi()} />)
    const github = await screen.findByRole('region', { name: 'Code repository' })
    fireEvent.click(within(github).getByRole('button', { name: 'Show Code repository settings' }))
    expect(await within(github).findByLabelText('Repository (owner/repo)')).toBeInTheDocument()
    fireEvent.click(within(github).getByRole('heading', { name: 'Code repository' }))
    await waitFor(() => expect(within(github).queryByLabelText('Repository (owner/repo)')).toBeNull())
  })

  it('keeps what was typed when a section is closed and reopened', async () => {
    render(<SettingsIntegrations api={fakeApi()} />)
    const github = await section('Code repository')
    fireEvent.input(within(github).getByLabelText('Repository (owner/repo)'), { target: { value: 'a/b' } })
    fireEvent.click(within(github).getByRole('button', { name: 'Hide Code repository settings' }))
    fireEvent.click(await within(github).findByRole('button', { name: 'Show Code repository settings' }))
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
    const github = await section('Code repository')
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
    const github = await section('Code repository')
    const repo = within(github).getByLabelText('Repository (owner/repo)')
    fireEvent.input(repo, { target: { value: 'design-tokens' } })
    fireEvent.click(within(github).getByRole('button', { name: 'Save configuration' }))
    expect(await within(github).findByText('Check the highlighted fields')).toBeInTheDocument()
    expect(repo).toHaveAttribute('aria-invalid', 'true')
    expect(repo).toHaveAccessibleDescription(expect.stringContaining('owner/repository'))
    expect(api.save).not.toHaveBeenCalled()
  })

  it('sets up one MCP scenario at a time: Set up, fill in, save, and the section reads Configured', async () => {
    const api = fakeApi()
    render(<SettingsIntegrations api={api} />)
    const mcp = await section('MCP + code sync')
    expect(within(mcp).getByText('Not configured')).toBeInTheDocument()
    expect([...mcp.querySelectorAll('.bb-integrations__group')].map((g) => g.getAttribute('aria-label'))).toEqual(['Component to Storybook', 'Screen to code', 'Library update to screens'])
    expect(within(mcp).getAllByRole('button', { name: 'Set up' })).toHaveLength(3)
    expect(within(mcp).getByLabelText('GitHub Enterprise base URL (optional)')).toBeInTheDocument()

    const screenCard = within(mcp).getByRole('group', { name: 'Screen to code' })
    fireEvent.click(within(screenCard).getByRole('button', { name: 'Set up' }))
    fireEvent.input(within(screenCard).getByLabelText('Repository (owner/repo)'), { target: { value: ' acme/web ' } })
    fireEvent.input(within(screenCard).getByLabelText('Personal access token'), { target: { value: 'ghp_test' } })
    expect(within(screenCard).getByText('Configured')).toBeInTheDocument()
    expect(within(mcp).getByText('Not configured')).toBeInTheDocument()
    fireEvent.click(within(mcp).getByRole('button', { name: 'Save configuration' }))
    await within(mcp).findByText('Saved')
    expect(api.save).toHaveBeenCalledWith('mcp', { ...DEFAULT_INTEGRATIONS.mcp, screenRepo: 'acme/web', screenToken: 'ghp_test' })
    expect(within(mcp).queryByText('Not configured')).toBeNull()
    expect(within(mcp).getAllByRole('button', { name: 'Set up' })).toHaveLength(2)
  })

  it('flags a bad MCP repository inside its scenario card and does not save', async () => {
    const api = fakeApi({ ...DEFAULT_INTEGRATIONS, mcp: { ...DEFAULT_INTEGRATIONS.mcp, libraryRepo: 'acme/app', libraryToken: 'ghp_l' } })
    render(<SettingsIntegrations api={api} />)
    const mcp = await section('MCP + code sync')
    const library = within(mcp).getByRole('group', { name: 'Library update to screens' })
    const repo = within(library).getByLabelText('Repository (owner/repo)')
    fireEvent.input(repo, { target: { value: 'app' } })
    fireEvent.click(within(mcp).getByRole('button', { name: 'Save configuration' }))
    expect(await within(mcp).findByText('Check the highlighted fields')).toBeInTheDocument()
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
    const card = (dual: HTMLElement, name: string) => within(within(dual).getByRole('group', { name }))

    it('starts with one file, offers what it contains and saves a pasted URL as its file key with the one token', async () => {
      const api = fakeApi()
      render(<SettingsIntegrations api={api} />)
      const dual = await section('Dual File Mode')
      expect(within(dual).getByText('1 of 3')).toBeInTheDocument()
      expect(within(dual).queryByRole('button', { name: /^Remove/ })).toBeNull()
      fireEvent.input(within(dual).getByLabelText('Figma personal access token'), { target: { value: 'figd_test' } })
      const file1 = card(dual, 'File 1')
      fireEvent.input(file1.getByLabelText('Figma file URL'), { target: { value: 'https://www.figma.com/design/JPZ7koqomjcjczGQuhIMVH/Plugin-UI?node-id=0-1' } })
      fireEvent.input(file1.getByLabelText('File name'), { target: { value: 'Core library' } })
      fireEvent.click(within(dual).getByRole('button', { name: /Contains/ }))
      expect(within(dual).getAllByRole('option').map((o) => o.textContent)).toEqual(['Variables', 'Components', 'Variables + Components'])
      fireEvent.click(within(dual).getByRole('option', { name: 'Variables' }))
      fireEvent.click(within(dual).getByRole('button', { name: 'Save configuration' }))
      await within(dual).findByText('Saved')
      expect(api.save).toHaveBeenCalledWith('dualFile', { enabled: true, token: 'figd_test', files: [{ name: 'Core library', id: 'JPZ7koqomjcjczGQuhIMVH', role: 'Variables' }] })
    })

    it('adds files named File 2 and File 3, stops at three, asks for a URL in an added file and removes one', async () => {
      const api = fakeApi()
      render(<SettingsIntegrations api={api} />)
      const dual = await section('Dual File Mode')
      fireEvent.input(within(dual).getByLabelText('Figma personal access token'), { target: { value: 'figd_test' } })
      fireEvent.input(card(dual, 'File 1').getByLabelText('Figma file URL'), { target: { value: 'VARS1' } })
      const add = within(dual).getByRole('button', { name: 'Add file' })
      fireEvent.click(add)
      fireEvent.click(add)
      expect(within(dual).getByText('3 of 3')).toBeInTheDocument()
      expect(add).toBeDisabled()
      expect(card(dual, 'File 2').getByLabelText('File name')).toHaveValue('File 2')
      fireEvent.input(card(dual, 'File 2').getByLabelText('Figma file URL'), { target: { value: 'https://www.figma.com/design/ICONS2/Icons' } })
      fireEvent.click(within(dual).getByRole('button', { name: 'Save configuration' }))
      expect(await within(dual).findByText('Check the highlighted fields')).toBeInTheDocument()
      expect(card(dual, 'File 3').getByLabelText('Figma file URL')).toHaveAccessibleDescription('Add File 3’s URL, or remove it')
      fireEvent.click(within(dual).getByRole('button', { name: 'Remove File 3' }))
      expect(add).not.toBeDisabled()
      fireEvent.click(within(dual).getByRole('button', { name: 'Save configuration' }))
      await within(dual).findByText('Saved')
      expect(api.save).toHaveBeenCalledWith('dualFile', expect.objectContaining({ files: [
        { name: 'File 1', id: 'VARS1', role: 'Variables + Components' }, { name: 'File 2', id: 'ICONS2', role: 'Components' },
      ] }))
    })

    it('asks for the token a listed file needs before saving', async () => {
      const api = fakeApi()
      render(<SettingsIntegrations api={api} />)
      const dual = await section('Dual File Mode')
      fireEvent.input(card(dual, 'File 1').getByLabelText('Figma file URL'), { target: { value: 'COMP2' } })
      fireEvent.click(within(dual).getByRole('button', { name: 'Save configuration' }))
      expect(await within(dual).findByText('Check the highlighted fields')).toBeInTheDocument()
      expect(within(dual).getByLabelText('Figma personal access token')).toHaveAccessibleDescription(expect.stringContaining('access token'))
      expect(api.save).not.toHaveBeenCalled()
    })

    it('tests the typed files against Figma and reports what each holds', async () => {
      const test = vi.fn(async () => ({ message: 'File 1 “Brand UI”: 1,026 variables in 3 collections.' }))
      const api = { ...fakeApi(), test }
      render(<SettingsIntegrations api={api} />)
      const dual = await section('Dual File Mode')
      fireEvent.input(within(dual).getByLabelText('Figma personal access token'), { target: { value: 'figd_test' } })
      fireEvent.input(card(dual, 'File 1').getByLabelText('Figma file URL'), { target: { value: 'VARS1' } })
      fireEvent.click(within(dual).getByRole('button', { name: 'Test connection' }))
      expect(await within(dual).findByText(/1,026 variables in 3 collections/)).toBeInTheDocument()
      expect(test).toHaveBeenCalledWith('dualFile', expect.objectContaining({ token: 'figd_test', files: [{ name: 'File 1', id: 'VARS1', role: 'Variables + Components' }] }))
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
    const github = await section('Code repository')
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
      const github = await section('Code repository')
      expect(within(github).getByText('Set by Ikea')).toBeInTheDocument()
      expect(within(github).getByLabelText('Repository (owner/repo)')).toBeDisabled()
      expect(within(github).getByLabelText('Access token')).not.toBeDisabled()
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
    fireEvent.click(screen.getByRole('button', { name: 'Import / export' }))
    fireEvent.click(screen.getByRole('option', { name: 'Import settings' }))
    fireEvent.change(screen.getByLabelText('Settings file'), { target: { files: [{ name: 'bridge-settings.json', size: text.length, text: async () => text }] } })
    fireEvent.click(await screen.findByRole('button', { name: 'Apply settings' }))
    await waitFor(() => expect(within(screen.getByRole('region', { name: 'Storybook' })).getByText('Configured')).toBeInTheDocument())
    expect(within(screen.getByRole('dialog', { name: 'Import settings' })).getByText('Settings imported')).toBeInTheDocument()
  })
})

describe('SettingsIntegrations · Connection card', () => {
  const withGithub = (github: Partial<IntegrationSettings['github']>): IntegrationSettings => ({ ...DEFAULT_INTEGRATIONS, github: { ...DEFAULT_INTEGRATIONS.github, ...github } })
  const withJira = (jira: Partial<IntegrationSettings['jira']>): IntegrationSettings => ({ ...DEFAULT_INTEGRATIONS, jira: { ...DEFAULT_INTEGRATIONS.jira, enabled: true, ...jira } })
  const card = (region: HTMLElement, name: string) => within(within(region).getByRole('group', { name }))

  it('asks where GitHub is, names what it found, and offers a token while no broker exists', async () => {
    render(<SettingsIntegrations api={fakeApi()} />)
    const github = await section('Code repository')
    const connection = card(github, 'GitHub connection')
    expect(connection.getByText('GitHub.com')).toBeInTheDocument()
    expect(connection.getByRole('tab', { name: 'Sign in' })).toBeDisabled()
    expect(connection.getByText(/Sign-in needs Bluebird Cloud/)).toBeInTheDocument()
    expect(connection.getByLabelText('Access token')).toBeInTheDocument()
    fireEvent.input(within(github).getByLabelText('Where’s your GitHub?'), { target: { value: 'acme.ghe.com' } })
    expect(connection.getByText('GitHub Enterprise Cloud')).toBeInTheDocument()
  })

  it('signs in through the company gateway and saves the sign-in like a token', async () => {
    // The first poll waits until the test has seen the code, then the sign-in finishes.
    let finish: () => void = () => {}
    const signedIn = new Promise<void>((resolve) => { finish = resolve })
    const fetch = vi.fn(async (url: string) => url.endsWith('/keys')
      ? { status: 200, json: async () => ({ read: 'r'.repeat(32), write: 'w'.repeat(32), code: 'K7Q-X92' }) }
      : signedIn.then(() => ({ status: 200, json: async () => ({ accessToken: 'gho_maria', account: '@maria-r', expiresAt: '' }) })))
    vi.stubGlobal('fetch', fetch)
    const api = { ...fakeApi(withGithub({ gatewayUrl: 'https://gw.acme.internal', repo: 'acme/tokens' })), openExternal: vi.fn(async () => undefined) }
    try {
      render(<SettingsIntegrations api={api} />)
      const github = await section('Code repository')
      const connection = card(github, 'GitHub connection')
      fireEvent.click(connection.getByRole('tab', { name: 'Sign in' }))
      fireEvent.click(connection.getByRole('button', { name: 'Sign in with GitHub' }))
      expect(await connection.findByText('K7Q-X92')).toBeInTheDocument()
      expect(connection.getByText(/^Type\s+in your browser$/)).toBeInTheDocument()
      finish()
      expect(await connection.findByText('Connected as @maria-r')).toBeInTheDocument()
      expect(api.openExternal).toHaveBeenCalledWith(`https://gw.acme.internal/auth/github/start?host=github.com&write=${'w'.repeat(32)}`)
      // A GitHub App only reaches repositories where it's installed: the admin installs it once.
      fireEvent.click(connection.getByRole('button', { name: 'Install Bluebird on your organisation' }))
      expect(api.openExternal).toHaveBeenLastCalledWith('https://gw.acme.internal/auth/github/install')
      fireEvent.click(within(github).getByRole('button', { name: 'Save configuration' }))
      await waitFor(() => expect(api.save).toHaveBeenCalledWith('github', expect.objectContaining({ method: 'signin', apiKey: 'gho_maria', signinAccount: '@maria-r' })))
      fireEvent.click(connection.getByRole('button', { name: 'Disconnect' }))
      expect(connection.getByRole('button', { name: 'Sign in with GitHub' })).toBeInTheDocument()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('offers the install link for GitHub only: Atlassian sign-in reaches every site the person can see', async () => {
    render(<SettingsIntegrations api={fakeApi(withJira({ siteUrl: 'https://acme.atlassian.net', proxyUrl: 'https://gw.acme.internal', method: 'signin', apiKey: 'tok', signinAccount: 'Maria Rossi' }))} />)
    const jira = await section('Jira integration')
    expect(card(jira, 'Jira connection').getByText('Connected as Maria Rossi')).toBeInTheDocument()
    expect(within(jira).queryByRole('button', { name: /Install Bluebird/ })).toBeNull()
  })

  it('says when a sign-in expired and offers to sign in again', async () => {
    render(<SettingsIntegrations api={fakeApi(withGithub({ gatewayUrl: 'https://gw.acme.internal', method: 'signin', apiKey: 'gho_old', signinAccount: '@maria-r', signinExpires: '2020-01-01T00:00:00Z' }))} />)
    const github = await section('Code repository')
    expect(within(github).getByText('Your GitHub sign-in expired')).toBeInTheDocument()
    expect(card(github, 'GitHub connection').getByRole('button', { name: 'Sign in again' })).toBeInTheDocument()
  })

  it('asks Jira Cloud for an API token and email, and Data Center for a personal token only', async () => {
    const { unmount } = render(<SettingsIntegrations api={fakeApi(withJira({ siteUrl: 'https://acme.atlassian.net' }))} />)
    let jira = await section('Jira integration')
    expect(card(jira, 'Jira connection').getByText('Jira Cloud')).toBeInTheDocument()
    expect(within(jira).getByLabelText('API token')).toBeInTheDocument()
    expect(within(jira).getByLabelText('Email')).toBeInTheDocument()
    unmount()
    render(<SettingsIntegrations api={fakeApi(withJira({ baseUrl: 'https://jira.acme.internal' }))} />)
    jira = await section('Jira integration')
    expect(card(jira, 'Jira connection').getByText('Jira Data Center')).toBeInTheDocument()
    expect(within(jira).getByLabelText('Personal access token')).toBeInTheDocument()
    expect(within(jira).queryByLabelText('Email')).toBeNull()
  })

  it('files a Cloud address under the site and anything else under the base URL', async () => {
    const api = fakeApi(withJira({}))
    render(<SettingsIntegrations api={api} />)
    const jira = await section('Jira integration')
    fireEvent.input(within(jira).getByLabelText('Where’s your Jira?'), { target: { value: 'jira.acme.internal' } })
    fireEvent.input(within(jira).getByLabelText('Personal access token'), { target: { value: 'pat' } })
    fireEvent.click(within(jira).getByRole('button', { name: 'Save configuration' }))
    await waitFor(() => expect(api.save).toHaveBeenCalledWith('jira', expect.objectContaining({ baseUrl: 'https://jira.acme.internal', siteUrl: '' })))
  })

  it('shows the gateway address only while the gateway is on, and clears it when turned off', async () => {
    const api = fakeApi(withJira({ siteUrl: 'https://acme.atlassian.net', proxyUrl: 'https://gw.acme.internal' }))
    render(<SettingsIntegrations api={api} />)
    const jira = await section('Jira integration')
    expect((within(jira).getByLabelText('Company gateway URL') as HTMLInputElement).value).toBe('https://gw.acme.internal')
    fireEvent.click(within(jira).getByRole('switch', { name: /Use a company gateway/ }))
    expect(within(jira).queryByLabelText('Company gateway URL')).toBeNull()
    fireEvent.click(within(jira).getByRole('button', { name: 'Save configuration' }))
    await waitFor(() => expect(api.save).toHaveBeenCalledWith('jira', expect.objectContaining({ proxyUrl: '' })))
  })
})

describe('SettingsIntegrations · GitHub or Bitbucket', () => {
  const withGithub = (github: Partial<IntegrationSettings['github']>): IntegrationSettings => ({ ...DEFAULT_INTEGRATIONS, github: { ...DEFAULT_INTEGRATIONS.github, ...github } })

  it('switches the Code repository to Bitbucket: its address, badge, email + API token, and logo', async () => {
    const { container } = render(<SettingsIntegrations api={fakeApi(withGithub({ repo: 'acme/tokens', apiKey: 'ghp_old', method: 'token' }))} />)
    const code = await section('Code repository')
    fireEvent.click(within(code).getByRole('tab', { name: 'Bitbucket' }))
    const connection = within(within(code).getByRole('group', { name: 'Bitbucket connection' }))
    expect(within(code).getByLabelText('Where’s your Bitbucket?')).toBeInTheDocument()
    expect(connection.getByText('Bitbucket Cloud')).toBeInTheDocument()
    expect(connection.getByLabelText('Atlassian email')).toBeInTheDocument()
    // The GitHub token is cleared: it must never be sent to Bitbucket.
    expect(connection.getByLabelText('API token')).toHaveValue('')
    expect(within(code).getByLabelText('Repository (workspace/repo)')).toHaveValue('acme/tokens')
    expect(container.querySelector('[data-logo="bitbucket"]')).not.toBeNull()
  })

  it('saves the host and the Atlassian email with the section', async () => {
    const api = fakeApi()
    render(<SettingsIntegrations api={api} />)
    const code = await section('Code repository')
    fireEvent.click(within(code).getByRole('tab', { name: 'Bitbucket' }))
    fireEvent.input(within(code).getByLabelText('Atlassian email'), { target: { value: 'maria@acme.com' } })
    fireEvent.input(within(code).getByLabelText('API token'), { target: { value: 'ATATT-tok' } })
    fireEvent.input(within(code).getByLabelText('Repository (workspace/repo)'), { target: { value: 'acme/tokens' } })
    fireEvent.click(within(code).getByRole('button', { name: 'Save configuration' }))
    await waitFor(() => expect(api.save).toHaveBeenCalledWith('github', expect.objectContaining({ host: 'bitbucket', email: 'maria@acme.com', apiKey: 'ATATT-tok', repo: 'acme/tokens' })))
  })

  it('says Bitbucket Data Center is coming when the address isn’t bitbucket.org', async () => {
    render(<SettingsIntegrations api={fakeApi(withGithub({ host: 'bitbucket', baseUrl: 'https://bitbucket.acme.internal' }))} />)
    const code = await section('Code repository')
    expect(within(code).getByText('Bitbucket Data Center is coming')).toBeInTheDocument()
    expect(within(within(code).getByRole('group', { name: 'Bitbucket connection' })).getByText('Bitbucket Data Center')).toBeInTheDocument()
  })

  it('gives each MCP scenario its own host, asking for the Atlassian email only on Bitbucket', async () => {
    render(<SettingsIntegrations api={fakeApi()} />)
    const mcp = await section('MCP + code sync')
    expect(within(mcp).queryByLabelText('Atlassian email')).toBeNull()
    const screenCard = within(within(mcp).getByRole('group', { name: 'Screen to code' }))
    fireEvent.click(screenCard.getByRole('button', { name: 'Set up' }))
    expect(screenCard.queryByLabelText('Atlassian email')).toBeNull()
    fireEvent.click(screenCard.getByRole('tab', { name: 'Bitbucket' }))
    expect(screenCard.getByLabelText('Atlassian email')).toBeInTheDocument()
    expect(screenCard.getByLabelText('API token')).toBeInTheDocument()
    expect(within(mcp).getAllByLabelText('Atlassian email')).toHaveLength(1)
  })
})

describe('SettingsIntegrations · sign in with Atlassian and Bitbucket', () => {
  const CLOUD = '0a1b2c3d-4e5f-6789-abcd-ef0123456789'
  /** A broker that finishes the sign-in on the first poll with `result`, recording which service was asked for. */
  function broker(result: Record<string, unknown>) {
    const urls: string[] = []
    const fetch = vi.fn(async (url: string) => {
      urls.push(url)
      return url.endsWith('/keys')
        ? { status: 200, json: async () => ({ read: 'r'.repeat(32), write: 'w'.repeat(32), code: 'K7Q-X92' }) }
        : { status: 200, json: async () => result }
    })
    return { fetch, urls }
  }

  it('signs in to Jira Cloud and keeps the site’s cloudId with the token', async () => {
    const b = broker({ accessToken: 'atl_tok', account: 'Maria Rossi', expiresAt: '', site: { cloudId: CLOUD, url: 'https://acme.atlassian.net' } })
    vi.stubGlobal('fetch', b.fetch)
    const settings = { ...DEFAULT_INTEGRATIONS, jira: { ...DEFAULT_INTEGRATIONS.jira, enabled: true, siteUrl: 'https://acme.atlassian.net', proxyUrl: 'https://gw.acme.com', projectKey: 'DS' } }
    const api = { ...fakeApi(settings), openExternal: vi.fn(async () => undefined) }
    try {
      render(<SettingsIntegrations api={api} />)
      const jira = await section('Jira integration')
      const connection = within(within(jira).getByRole('group', { name: 'Jira connection' }))
      fireEvent.click(connection.getByRole('tab', { name: 'Sign in' }))
      fireEvent.click(connection.getByRole('button', { name: 'Sign in with Atlassian' }))
      expect(await connection.findByText('Connected as Maria Rossi')).toBeInTheDocument()
      expect(b.urls[0]).toBe('https://gw.acme.com/auth/jira/keys')
      expect(api.openExternal).toHaveBeenCalledWith(`https://gw.acme.com/auth/jira/start?host=acme.atlassian.net&write=${'w'.repeat(32)}`)
      fireEvent.click(within(jira).getByRole('button', { name: 'Save configuration' }))
      await waitFor(() => expect(api.save).toHaveBeenCalledWith('jira', expect.objectContaining({ method: 'signin', apiKey: 'atl_tok', cloudId: CLOUD })))
      // Disconnect forgets the site id with the token.
      fireEvent.click(connection.getByRole('button', { name: 'Disconnect' }))
      fireEvent.click(within(jira).getByRole('button', { name: 'Save configuration' }))
      await waitFor(() => expect(api.save).toHaveBeenLastCalledWith('jira', expect.objectContaining({ apiKey: '', cloudId: '' })))
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('signs in to Bitbucket through the broker and saves it as a Bearer token (no email)', async () => {
    const b = broker({ accessToken: 'bb_tok', account: 'Maria Rossi', expiresAt: '2026-11-28T14:00:00Z' })
    vi.stubGlobal('fetch', b.fetch)
    const settings = { ...DEFAULT_INTEGRATIONS, github: { ...DEFAULT_INTEGRATIONS.github, host: 'bitbucket', email: 'maria@acme.com', repo: 'acme/tokens', gatewayUrl: 'https://gw.acme.com' } }
    const api = { ...fakeApi(settings), openExternal: vi.fn(async () => undefined) }
    try {
      render(<SettingsIntegrations api={api} />)
      const code = await section('Code repository')
      const connection = within(within(code).getByRole('group', { name: 'Bitbucket connection' }))
      fireEvent.click(connection.getByRole('tab', { name: 'Sign in' }))
      fireEvent.click(connection.getByRole('button', { name: 'Sign in with Bitbucket' }))
      expect(await connection.findByText('Connected as Maria Rossi')).toBeInTheDocument()
      expect(b.urls[0]).toBe('https://gw.acme.com/auth/bitbucket/keys')
      expect(api.openExternal).toHaveBeenCalledWith(`https://gw.acme.com/auth/bitbucket/start?host=bitbucket.org&write=${'w'.repeat(32)}`)
      // No GitHub-only install link for Bitbucket.
      expect(connection.queryByRole('button', { name: /Install Bluebird/ })).toBeNull()
      fireEvent.click(within(code).getByRole('button', { name: 'Save configuration' }))
      await waitFor(() => expect(api.save).toHaveBeenCalledWith('github', expect.objectContaining({ host: 'bitbucket', method: 'signin', apiKey: 'bb_tok', email: '', signinAccount: 'Maria Rossi' })))
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
