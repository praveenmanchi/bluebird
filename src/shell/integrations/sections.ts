// Settings › Integrations content, section by section, as laid out in Figma
// "Settings · Integrations" (40000408:8714). Copy, icons and order follow the
// frame; an array in `blocks` is one row of side-by-side columns.
import type { IconName, SectionHeaderLogo } from '@shared/ui'
import { FILE_ROLES, MODEL_OPTIONS, OUTPUT_FORMATS, type IntegrationId } from '@shared/integrations'

export interface TextFieldSpec { kind: 'text'; key: string; label: string; icon: IconName; placeholder: string; helper?: string; secret?: boolean }
export interface SelectFieldSpec { kind: 'select'; key: string; label: string; icon: IconName; options: readonly string[] }
export interface SwitchSpec { kind: 'switch'; key: string; title: string; description: string }
export interface TextAreaSpec { kind: 'textarea'; key: string; label: string; placeholder: string; helper: string }
export interface ProviderSpec { kind: 'provider'; provider: 'claude' | 'openai' | 'gemini'; model: SelectFieldSpec; apiKey: TextFieldSpec }
export type FieldSpec = TextFieldSpec | SelectFieldSpec | SwitchSpec | TextAreaSpec | ProviderSpec
/** A column is one field or a stack of fields. */
export type ColumnSpec = FieldSpec | readonly FieldSpec[]
export type BlockSpec = FieldSpec | readonly ColumnSpec[]

export interface SectionSpec {
  id: IntegrationId
  title: string
  description: string
  logo?: SectionHeaderLogo
  /** Boolean value driven by the header switch (Figma "Toggle" on the section title). */
  toggleKey?: string
  /** Column template of the rows: halves, or Dual File's narrow ID / wide key split. */
  columns?: 'halves' | 'narrow-wide'
  blocks: readonly BlockSpec[]
}

const BRANCHES = ['main', 'master', 'develop'] as const
const GITHUB_ENTERPRISE_HELPER = 'For GitHub Enterprise only. Your instance URL without /api/v3 (e.g. https://github.company.com). Leave blank for github.com.'
const LINKS_OFF = (what: string) => `When off, the agent will not surface ${what} even if configured.`

const provider = (id: ProviderSpec['provider'], name: string, placeholder: string): ProviderSpec => ({
  kind: 'provider',
  provider: id,
  model: { kind: 'select', key: `${id}Model`, label: 'Default Model', icon: 'ai-model', options: MODEL_OPTIONS[id] },
  apiKey: { kind: 'text', key: `${id}Key`, label: `${name} API Key`, icon: 'api-key', placeholder, secret: true },
})

const LIBRARY_TOKEN = 'Personal access token: file_variables:read, library_content:read'

/** One Dual File slot: ID and what it contains in the narrow column, its API key in the wide one. */
const dualFileRow = (n: 1 | 2): readonly ColumnSpec[] => [
  [
    { kind: 'text', key: `file${n}Id`, label: `File ${n} ID`, icon: n === 1 ? 'variables' : 'component-audit', placeholder: 'File URL or ID from figma.com/design/…' },
    { kind: 'select', key: `file${n}Role`, label: `File ${n} contains`, icon: 'layers', options: FILE_ROLES },
  ],
  [
    {
      kind: 'text', key: `file${n}Key`, label: `File ${n} API Key`, icon: 'api-key', placeholder: LIBRARY_TOKEN, secret: true,
      helper: n === 1
        ? 'Variables need file_variables:read (Enterprise); components need library_content:read and must be published.'
        : 'Optional when File 1’s key can open this file too. Leave File 2 empty if File 1 holds both.',
    },
  ],
]

export const SECTIONS: readonly SectionSpec[] = [
  {
    id: 'github', logo: 'github', title: 'GitHub Output Configuration', columns: 'halves',
    description: 'Configure the GitHub repository where extracted variables will be committed via Pull Request.',
    blocks: [
      [
        [
          { kind: 'text', key: 'apiKey', label: 'API key', icon: 'api-key', placeholder: 'Personal access token with file_variables:read', secret: true },
          { kind: 'select', key: 'branch', label: 'Branch', icon: 'branch', options: BRANCHES },
        ],
        [
          { kind: 'text', key: 'repo', label: 'Repository (owner/repo)', icon: 'access', placeholder: 'owner/repository' },
          { kind: 'select', key: 'tokenPath', label: 'Token storage location (file/folder path)', icon: 'folder', options: ['tokens.json', 'tokens', 'design-tokens.json'] },
        ],
      ],
      { kind: 'text', key: 'baseUrl', label: 'Base URL - Enterprise (optional)', icon: 'url', placeholder: 'https://github.yourcompany.com', helper: GITHUB_ENTERPRISE_HELPER },
      { kind: 'switch', key: 'diffComparison', title: 'Enable diff comparison', description: 'When enabled, the Extract tab compares local variables against the last pushed version on GitHub, showing what changed.' },
    ],
  },
  {
    id: 'notifications', logo: 'teams', title: 'Notifications',
    description: 'Configure Power Automate workflow URLs to receive Teams notifications when Pull Requests are created. Toggle notifications in the Extract tab.',
    blocks: [
      { kind: 'text', key: 'designSystemWebhook', label: 'Power Automate — Design System Team', icon: 'url', placeholder: 'https://prod-xx.westus.logic.azure.com/workflows/...' },
      { kind: 'text', key: 'devTeamWebhook', label: 'Power Automate — Dev Team', icon: 'url', placeholder: 'https://prod-xx.westus.logic.azure.com/workflows/...' },
      { kind: 'text', key: 'emails', label: 'Email Notifications', icon: 'message', placeholder: 'team@company.com', helper: 'Comma-separated addresses for PR summary emails (requires backend mail service).' },
    ],
  },
  {
    id: 'storybook', logo: 'storybook', title: 'Storybook',
    description: 'Used by Ask UXAI to link each component to its Storybook playground.',
    blocks: [
      { kind: 'text', key: 'baseUrl', label: 'Base URL', icon: 'url', placeholder: 'https://design-system.example.com/storybook', helper: 'Root URL of your Storybook deployment. Must be publicly accessible or reachable from your network.' },
      { kind: 'text', key: 'storyPathTemplate', label: 'Story path template', icon: 'file', placeholder: '?path=/story/components-{slug}--default', helper: 'Appended to Base URL. Use {slug} for kebab-cased name (PrimaryButton → primary-button) or {name} for the raw name.' },
      { kind: 'text', key: 'indexUrl', label: 'Discovery via index.json (optional)', icon: 'file', placeholder: 'https://design-system.example.com/storybook/index.json', helper: 'When set, the agent fetches the Storybook index to resolve real story IDs instead of relying on the template. Falls back to the template if unreachable.' },
      { kind: 'switch', key: 'linksEnabled', title: 'Enable Storybook links in Ask UXAI', description: LINKS_OFF('Storybook URLs') },
    ],
  },
  {
    id: 'zeroheight', logo: 'zeroheight', title: 'Zeroheight', columns: 'halves',
    description: 'Used by Ask UXAI to link each component to its Zeroheight documentation. Requires Enterprise plan.',
    blocks: [
      [
        { kind: 'text', key: 'apiKey', label: 'API Key', icon: 'api-key', placeholder: 'Bearer token from Zeroheight → Settings → API', secret: true },
        { kind: 'text', key: 'styleguideId', label: 'Styleguide ID', icon: 'file', placeholder: '12345' },
      ],
      { kind: 'text', key: 'publicBaseUrl', label: 'Public base URL (optional)', icon: 'url', placeholder: 'https://zeroheight.com/abc123/p', helper: 'Shown to designers when the agent surfaces docs links. Without it, links fall back to the styleguide root.' },
      { kind: 'switch', key: 'linksEnabled', title: 'Enable Zeroheight links in Ask UXAI', description: LINKS_OFF('Zeroheight documentation links') },
    ],
  },
  {
    id: 'dualFile', title: 'Dual File Mode', toggleKey: 'enabled', columns: 'narrow-wide',
    description: 'Point UXAI at the published library files your designs use: one file for variables and one for components, or a single file that holds both. Read through the Figma REST API.',
    blocks: [dualFileRow(1), dualFileRow(2)],
  },
  {
    id: 'ai', title: 'AI Agent Assistance (UXAI)', toggleKey: 'enabled',
    description: 'Configure the AI model and API keys for the UXAI assistant. Supports Claude (Anthropic), OpenAI, and Google Gemini.',
    blocks: [
      provider('claude', 'Claude', 'sk-ant-api03-...'),
      provider('openai', 'OpenAI', 'sk-proj-...'),
      provider('gemini', 'Gemini', 'AIzaSy...'),
      { kind: 'switch', key: 'managedAgents', title: 'Claude Managed Agents', description: 'Server-side agents with persistent memory, attached skills, and Dreams (auto-cleanup of memory). Adds a "Chat with agent" mode to the UXAI tab. Requires Anthropic API key with the managed-agents beta enabled.' },
      { kind: 'textarea', key: 'instructions', label: 'Custom Instructions (optional)', placeholder: 'Add any custom instructions for the AI assistant, e.g. preferred naming conventions, brand guidelines, or specific design system rules...', helper: 'These instructions will be included in every AI analysis prompt to guide the assistant\'s behavior.' },
    ],
  },
  {
    id: 'mcp', title: 'MCP + Code Sync', toggleKey: 'enabled', columns: 'halves',
    description: 'Where the MCP tab pushes design-token JSON. The repo\'s existing CI/CD rebuilds Storybook on each push. When off, the push button stays disabled.',
    blocks: [
      [
        [
          { kind: 'text', key: 'repo', label: 'Repository (owner/repo)', icon: 'access', placeholder: 'org/web-components-storybook' },
          { kind: 'select', key: 'baseBranch', label: 'Base branch', icon: 'branch', options: BRANCHES },
        ],
        [
          { kind: 'text', key: 'token', label: 'Personal access token', icon: 'api-key', placeholder: 'GitHub PAT with repo:write', secret: true },
          { kind: 'select', key: 'filePath', label: 'File path in the repo', icon: 'file', options: ['src/tokens/design-tokens.json', 'tokens/design-tokens.json', 'design-tokens.json'] },
        ],
      ],
      [
        { kind: 'text', key: 'outputFormat', label: 'Output format', icon: 'folder', placeholder: OUTPUT_FORMATS.join(', ').replace(/, (?=[^,]*$)/, ', or ') },
        { kind: 'text', key: 'branchTemplate', label: 'Branch name template ({date} resolves to ISO YYYY-MM-DD.)', icon: 'file', placeholder: 'ds/token-update-{date}' },
      ],
      { kind: 'text', key: 'enterpriseUrl', label: 'GitHub Enterprise base URL (optional)', icon: 'url', placeholder: 'https://github.yourcompany.com (without /api/v3)' },
    ],
  },
  {
    id: 'jira', title: 'Jira Integration', toggleKey: 'enabled', columns: 'halves',
    description: 'Connect Jira to browse and pull tickets into the Workflow tab (UX persona). Tickets can be sent to UXAI for AI-assisted analysis.',
    blocks: [
      [
        [
          { kind: 'text', key: 'projectKey', label: 'Project Key', icon: 'api-key', placeholder: 'PROJ' },
          { kind: 'text', key: 'apiKey', label: 'Jira API Key', icon: 'api-key', placeholder: 'your-jira-api-token', secret: true },
        ],
        [
          { kind: 'text', key: 'email', label: 'Email ID', icon: 'message', placeholder: 'user@company.com' },
          { kind: 'text', key: 'siteUrl', label: 'Site URL', icon: 'api-key', placeholder: 'https://yourteam.atlassian.net' },
        ],
      ],
      { kind: 'text', key: 'baseUrl', label: 'Base URL - Enterprise (optional)', icon: 'url', placeholder: 'https://jira.yourcompany.com', helper: 'For Jira Server or Data Center only. Leave blank for Atlassian Cloud (Site URL above).' },
      { kind: 'text', key: 'proxyUrl', label: 'Proxy URL', icon: 'url', placeholder: 'http://localhost:8787', helper: 'Jira blocks direct calls from Figma plugins. Run `npm run jira:proxy` and enter http://localhost:8787.' },
    ],
  },
]
