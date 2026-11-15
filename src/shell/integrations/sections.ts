// Settings › Integrations content, section by section, as laid out in Figma
// "Settings · Integrations" (40000408:8714). Copy, icons and order follow the
// frame; an array in `blocks` is one row of side-by-side columns.
import type { IconName, SectionHeaderLogo } from '@shared/ui'
import {
  MAX_LIBRARY_FILES, MCP_FRAMEWORKS, MCP_PULL_REQUESTS, MCP_SCENARIO_LABEL, MODEL_OPTIONS, PROVIDER_OPTIONS, REFRESH_OPTIONS,
  type IntegrationId, type McpScenario,
} from '@shared/integrations'

export interface TextFieldSpec { kind: 'text'; key: string; label: string; icon: IconName; placeholder: string; helper?: string; secret?: boolean }
export interface SelectFieldSpec { kind: 'select'; key: string; label: string; icon: IconName; options: readonly string[] }
export interface SwitchSpec { kind: 'switch'; key: string; title: string; description: string }
export interface TextAreaSpec { kind: 'textarea'; key: string; label: string; placeholder: string; helper: string }
export interface ProviderSpec { kind: 'provider'; provider: 'claude' | 'openai' | 'gemini'; model: SelectFieldSpec; apiKey: TextFieldSpec }
/** Dual File Mode's library files: named cards of Contains + Figma file URL, with Add file / Remove (Figma "Settings · 600 · Integrations open"). */
export interface FilesListSpec { kind: 'files'; key: 'files'; label: string }
/** A field that edits values itself: everything but a group. */
export type LeafFieldSpec = TextFieldSpec | SelectFieldSpec | SwitchSpec | TextAreaSpec | ProviderSpec | FilesListSpec
/**
 * A bordered card of fields with its own status, e.g. one MCP hand-off scenario. `requires` are the
 * keys that make it "set up" (its repository and its token). Groups do not nest.
 */
export interface GroupSpec { kind: 'group'; id: string; title: string; requires: readonly string[]; blocks: readonly BlockSpec[] }
export type FieldSpec = LeafFieldSpec | GroupSpec
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
  /** Column template of the rows. */
  columns?: 'halves'
  blocks: readonly BlockSpec[]
}

const BRANCHES = ['main', 'master', 'develop'] as const
const GITHUB_ENTERPRISE_HELPER = 'For GitHub Enterprise only. Your instance URL without /api/v3 (e.g. https://github.company.com). Leave blank for github.com.'
const LINKS_OFF = (what: string) => `When off, the agent will not surface ${what} even if configured.`

const provider = (id: ProviderSpec['provider'], name: string, placeholder: string): ProviderSpec => ({
  kind: 'provider',
  provider: id,
  model: { kind: 'select', key: `${id}Model`, label: 'Default model', icon: 'ai-model', options: MODEL_OPTIONS[id] },
  apiKey: { kind: 'text', key: `${id}Key`, label: `${name} API key`, icon: 'api-key', placeholder, secret: true },
})

// MCP + code sync: every scenario has the same repository row and token; the keys carry its name.
const mcpRepoRow = (scenario: McpScenario): readonly ColumnSpec[] => [
  { kind: 'text', key: `${scenario}Repo`, label: 'Repository (owner/repo)', icon: 'access', placeholder: 'org/design-system' },
  { kind: 'select', key: `${scenario}Branch`, label: 'Base branch', icon: 'branch', options: BRANCHES },
]
const mcpToken = (scenario: McpScenario): TextFieldSpec => (
  { kind: 'text', key: `${scenario}Token`, label: 'Personal access token', icon: 'api-key', placeholder: 'GitHub token that can read pull requests', secret: true }
)
/** The scenarios that write new code: repository + branch, token + framework, then the folder it goes in. */
const mcpCodeBlocks = (scenario: 'component' | 'screen', folder: string): readonly BlockSpec[] => [
  mcpRepoRow(scenario),
  [mcpToken(scenario), { kind: 'select', key: `${scenario}Framework`, label: 'Framework', icon: 'file', options: MCP_FRAMEWORKS }],
  { kind: 'text', key: `${scenario}Folder`, label: 'Output folder', icon: 'folder', placeholder: folder },
]
const mcpGroup = (scenario: McpScenario, blocks: readonly BlockSpec[]): GroupSpec => (
  { kind: 'group', id: scenario, title: MCP_SCENARIO_LABEL[scenario], requires: [`${scenario}Repo`, `${scenario}Token`], blocks }
)

export const SECTIONS: readonly SectionSpec[] = [
  {
    id: 'github', logo: 'github', title: 'GitHub output configuration', columns: 'halves',
    description: 'Configure the GitHub repository where extracted variables will be committed via Pull Request.',
    blocks: [
      [
        [
          { kind: 'text', key: 'apiKey', label: 'API key', icon: 'api-key', placeholder: 'GitHub personal access token', secret: true },
          { kind: 'select', key: 'branch', label: 'Branch', icon: 'branch', options: BRANCHES },
        ],
        [
          { kind: 'text', key: 'repo', label: 'Repository (owner/repo)', icon: 'access', placeholder: 'owner/repository' },
          { kind: 'select', key: 'tokenPath', label: 'Token storage location (file/folder path)', icon: 'folder', options: ['tokens.json', 'tokens', 'design-tokens.json'] },
        ],
      ],
      { kind: 'text', key: 'baseUrl', label: 'Base URL - Enterprise (optional)', icon: 'url', placeholder: 'https://github.yourcompany.com', helper: GITHUB_ENTERPRISE_HELPER },
      { kind: 'switch', key: 'diffComparison', title: 'Enable diff comparison', description: 'When enabled, the Publish tab compares local variables against the last pushed version on GitHub, showing what changed.' },
    ],
  },
  {
    id: 'storage', logo: 'database', title: 'Storage', columns: 'halves',
    description: 'Where the team History is kept: a GitHub repository every designer’s plugin writes to and reads from. Extractions, reports, Code Connect templates, MCP pushes and UX AI answers land here, so everyone sees one changelog.',
    blocks: [
      { kind: 'switch', key: 'sameAsGithub', title: 'Use the GitHub output repository', description: 'When on, History uses the repository, branch and API key from GitHub output configuration above, and the fields below are ignored except the folder.' },
      [
        [
          { kind: 'text', key: 'apiKey', label: 'API key', icon: 'api-key', placeholder: 'Personal access token with Contents read and write', secret: true },
          { kind: 'text', key: 'branch', label: 'Branch', icon: 'branch', placeholder: 'main' },
        ],
        [
          { kind: 'text', key: 'repo', label: 'Repository (owner/repo)', icon: 'access', placeholder: 'owner/design-history' },
          { kind: 'text', key: 'folder', label: 'History folder', icon: 'folder', placeholder: '.bluebird/history', helper: 'One JSON file per day goes here, e.g. .bluebird/history/2026-11-12.json.' },
        ],
      ],
      { kind: 'text', key: 'baseUrl', label: 'Base URL - Enterprise (optional)', icon: 'url', placeholder: 'https://github.yourcompany.com', helper: GITHUB_ENTERPRISE_HELPER },
      { kind: 'select', key: 'refresh', label: 'Check for teammates’ changes', icon: 'branch', options: REFRESH_OPTIONS },
    ],
  },
  {
    id: 'notifications', logo: 'teams', title: 'Notifications',
    description: 'Configure Power Automate workflow URLs to receive Teams and Outlook notifications when pull requests are created or changelogs are sent for review. Toggle notifications where you send.',
    blocks: [
      { kind: 'text', key: 'designSystemWebhook', label: 'Power Automate — Design System Team', icon: 'url', placeholder: 'https://….environment.api.powerplatform.com/powerautomate/…' },
      { kind: 'text', key: 'devTeamWebhook', label: 'Power Automate — Dev Team', icon: 'url', placeholder: 'https://….environment.api.powerplatform.com/powerautomate/…' },
      { kind: 'text', key: 'outlookWebhook', label: 'Outlook webhook — Reviewers', icon: 'url', placeholder: 'https://….environment.api.powerplatform.com/powerautomate/…', helper: 'A Power Automate flow that emails the reviewers in Outlook, or an Outlook connector URL (*.webhook.office.com). Used when a changelog is sent for review.' },
      { kind: 'text', key: 'emails', label: 'Email Notifications', icon: 'message', placeholder: 'team@company.com', helper: 'Comma-separated addresses for PR summary emails (requires backend mail service).' },
    ],
  },
  {
    id: 'storybook', logo: 'storybook', title: 'Storybook',
    description: 'Used by UXAI to link each component to its Storybook playground.',
    blocks: [
      { kind: 'text', key: 'baseUrl', label: 'Base URL', icon: 'url', placeholder: 'https://design-system.example.com/storybook', helper: 'Root URL of your Storybook deployment. Must be publicly accessible or reachable from your network.' },
      { kind: 'text', key: 'storyPathTemplate', label: 'Story path template', icon: 'file', placeholder: '?path=/story/components-{slug}--default', helper: 'Appended to Base URL. Use {slug} for kebab-cased name (PrimaryButton → primary-button) or {name} for the raw name.' },
      { kind: 'text', key: 'indexUrl', label: 'Discovery via index.json (optional)', icon: 'file', placeholder: 'https://design-system.example.com/storybook/index.json', helper: 'When set, the agent fetches the Storybook index to resolve real story IDs instead of relying on the template. Falls back to the template if unreachable.' },
      { kind: 'switch', key: 'linksEnabled', title: 'Enable Storybook links in UXAI', description: LINKS_OFF('Storybook URLs') },
    ],
  },
  {
    id: 'zeroheight', logo: 'zeroheight', title: 'Zeroheight', columns: 'halves',
    description: 'Used by UXAI to link each component to its Zeroheight documentation. Requires Enterprise plan.',
    blocks: [
      [
        { kind: 'text', key: 'apiKey', label: 'API key', icon: 'api-key', placeholder: 'Bearer token from Zeroheight → Settings → API', secret: true },
        { kind: 'text', key: 'styleguideId', label: 'Styleguide ID', icon: 'file', placeholder: '12345' },
      ],
      { kind: 'text', key: 'publicBaseUrl', label: 'Public base URL (optional)', icon: 'url', placeholder: 'https://zeroheight.com/abc123/p', helper: 'Shown to designers when the agent surfaces docs links. Without it, links fall back to the styleguide root.' },
      { kind: 'switch', key: 'linksEnabled', title: 'Enable Zeroheight links in UXAI', description: LINKS_OFF('Zeroheight documentation links') },
    ],
  },
  {
    id: 'dualFile', logo: 'dual-file', title: 'Dual File Mode', toggleKey: 'enabled',
    description: `Point UXAI and the agents at the published library files your designs use. One Figma token opens every file: add up to ${MAX_LIBRARY_FILES} and say what each one holds.`,
    blocks: [
      {
        kind: 'text', key: 'token', label: 'Figma personal access token', icon: 'api-key', placeholder: 'figd_…', secret: true,
        helper: 'One token for every file below. Scopes: file_content:read, library_content:read, file_metadata:read. On Enterprise also file_variables:read (variables) and library_analytics:read (Audit › Across files). Components must be published.',
      },
      { kind: 'files', key: 'files', label: 'Library files' },
    ],
  },
  {
    id: 'ai', logo: 'ai', title: 'AI agent assistance (UXAI)', toggleKey: 'enabled',
    description: 'Configure the AI model and API keys for the UXAI assistant and the UX AI agents. Supports Claude (Anthropic), OpenAI, and Google Gemini: the provider you pick answers with its Default Model; the others are fallbacks when it has no key.',
    blocks: [
      { kind: 'select', key: 'provider', label: 'Answer with', icon: 'ai-model', options: PROVIDER_OPTIONS },
      provider('claude', 'Claude', 'sk-ant-api03-...'),
      provider('openai', 'OpenAI', 'sk-proj-...'),
      provider('gemini', 'Gemini', 'AIzaSy...'),
      { kind: 'switch', key: 'managedAgents', title: 'Claude Managed Agents', description: 'Server-side agents with persistent memory, attached skills, and Dreams (auto-cleanup of memory). Adds a "Chat with agent" mode to the UXAI tab. Requires Anthropic API key with the managed-agents beta enabled.' },
      { kind: 'textarea', key: 'instructions', label: 'Custom instructions (optional)', placeholder: 'Add any custom instructions for the AI assistant, e.g. preferred naming conventions, brand guidelines, or specific design system rules...', helper: 'These instructions will be included in every AI analysis prompt to guide the assistant\'s behavior.' },
    ],
  },
  {
    id: 'mcp', logo: 'mcp', title: 'MCP + code sync', toggleKey: 'enabled',
    description: 'Where MCP hand-offs go. Each scenario has its own repository and token, so each team connects only what it needs. Claude Code opens the pull requests and Bluebird tracks them.',
    blocks: [
      mcpGroup('component', mcpCodeBlocks('component', 'src/components')),
      mcpGroup('screen', [
        ...mcpCodeBlocks('screen', 'src/pages'),
        { kind: 'text', key: 'screenPackage', label: 'Design system package', icon: 'url', placeholder: '@acme/ui', helper: 'Screens import components from this package instead of copying them.' },
      ]),
      mcpGroup('library', [
        mcpRepoRow('library'),
        [mcpToken('library'), { kind: 'select', key: 'libraryPullRequests', label: 'Pull requests', icon: 'file', options: MCP_PULL_REQUESTS }],
      ]),
      { kind: 'text', key: 'enterpriseUrl', label: 'GitHub Enterprise base URL (optional)', icon: 'url', placeholder: 'https://github.yourcompany.com', helper: 'Shared by all three. Without /api/v3. Leave blank for github.com.' },
    ],
  },
  {
    id: 'jira', logo: 'jira', title: 'Jira integration', toggleKey: 'enabled', columns: 'halves',
    description: 'Connect Jira to browse and pull tickets into the Jira board tab. Tickets can be sent to UXAI for AI-assisted analysis.',
    blocks: [
      [
        [
          { kind: 'text', key: 'projectKey', label: 'Project key', icon: 'api-key', placeholder: 'PROJ' },
          { kind: 'text', key: 'apiKey', label: 'Jira API key', icon: 'api-key', placeholder: 'your-jira-api-token', secret: true },
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

/** The fields of blocks, rows and columns in page order, with each group opened up into its own fields. */
export function flatFields(blocks: readonly (BlockSpec | ColumnSpec)[]): LeafFieldSpec[] {
  return blocks.flatMap((block): LeafFieldSpec[] => {
    if (Array.isArray(block)) return flatFields(block as readonly ColumnSpec[])
    const field = block as FieldSpec
    return field.kind === 'group' ? flatFields(field.blocks) : [field]
  })
}

/** The value keys one field edits: an AI provider row edits its model and its key. */
export const fieldKeys = (field: LeafFieldSpec): string[] => (field.kind === 'provider' ? [field.model.key, field.apiKey.key] : [field.key])

/** Every value key a section's fields edit, header switch and the fields inside groups included. */
export function sectionFieldKeys(spec: SectionSpec): string[] {
  return [...(spec.toggleKey ? [spec.toggleKey] : []), ...flatFields(spec.blocks).flatMap(fieldKeys)]
}
