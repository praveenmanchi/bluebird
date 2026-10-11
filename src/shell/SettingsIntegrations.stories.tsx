import type { Meta, StoryObj } from '@storybook/preact-vite'
import { DEFAULT_INTEGRATIONS, validateIntegration, type IntegrationSettings } from '@shared/integrations'
import { SettingsIntegrations } from './SettingsIntegrations'
import type { IntegrationsApi } from './integrations/client'
import { figma } from './SettingsIntegrations.figma'
import { BrandGrid } from '../../.storybook/helpers'

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** In-memory store with the sandbox's rules, so Save behaves as in the plugin. */
function memoryApi(initial: IntegrationSettings = DEFAULT_INTEGRATIONS): IntegrationsApi {
  let settings = initial
  return {
    load: async () => { await wait(300); return settings },
    save: async (section, values) => {
      await wait(500)
      const first = Object.values(validateIntegration(section, values as never))[0]
      if (first) throw new Error(first)
      settings = { ...settings, [section]: values }
      return values
    },
  }
}

const configured: IntegrationSettings = {
  ...DEFAULT_INTEGRATIONS,
  github: { ...DEFAULT_INTEGRATIONS.github, apiKey: 'ghp_example', repo: 'gap-inc/design-tokens' },
  storybook: { ...DEFAULT_INTEGRATIONS.storybook, baseUrl: 'https://design-system.example.com/storybook', storyPathTemplate: '?path=/story/components-{slug}--default' },
  ai: { ...DEFAULT_INTEGRATIONS.ai, claudeKey: 'sk-ant-api03-example', instructions: 'Prefer semantic tokens over brand primitives.' },
  jira: { ...DEFAULT_INTEGRATIONS.jira, enabled: true, projectKey: 'DS', email: 'user@company.com', siteUrl: 'https://yourteam.atlassian.net' },
}

const meta = { title: 'Screens/Settings Integrations', parameters: { figma: { setId: figma.setId, name: figma.name } } } satisfies Meta
export default meta
type Story = StoryObj

/** Figma "Settings · Integrations" body: first run, every section on its defaults. */
export const Integrations: Story = {
  parameters: { figma: { variant: 'Settings · Integrations' } },
  render: () => <div style={{ width: '1046px' }}><SettingsIntegrations api={memoryApi()} /></div>,
}
/** Values already saved; Jira switched on. */
export const Configured: Story = {
  render: () => <div style={{ width: '1046px' }}><SettingsIntegrations api={memoryApi(configured)} /></div>,
}
/** The plugin's default 480px window: one column, provider rows wrap. */
export const Narrow: Story = {
  render: () => <div style={{ width: '456px' }}><SettingsIntegrations api={memoryApi(configured)} /></div>,
}
export const LoadFailed: Story = {
  render: () => <div style={{ width: '480px' }}><SettingsIntegrations api={{ load: async () => { throw new Error('figma.clientStorage is unavailable in this context.') }, save: async (_s, v) => v }} /></div>,
}
export const AcrossBrands: Story = {
  render: () => <BrandGrid width="480px"><SettingsIntegrations api={memoryApi(configured)} /></BrandGrid>,
}
