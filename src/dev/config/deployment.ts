// Plugin configuration › Deployment: the dialog's draft, read from plugin.config.json and turned
// back into the dev server's DeployPatch.
import type { DeployMode, PluginConfig } from '@shared/config'
import type { DeployPatch } from './api'

export interface DeployDraft {
  mode: DeployMode
  /** The brand a single-brand build ships; kept while Multi-brand is picked so switching back remembers it. */
  brand: string
  /** That brand's Figma plugin id and name in its own organisation; empty uses manifest.json's. */
  pluginId: string
  pluginName: string
}

/** Same rule as the config schema: Figma plugin ids are long decimal numbers. */
const PLUGIN_ID = /^[0-9]{6,25}$/

export function deployDraftFrom(config: PluginConfig, brand?: string): DeployDraft {
  const first = Object.keys(config.brand.brands)[0] ?? ''
  const id = brand ?? config.deploy.brand ?? first
  const plugin = config.brand.brands[id]?.figmaPlugin
  return { mode: brand ? 'single' : config.deploy.mode, brand: id, pluginId: plugin?.id ?? '', pluginName: plugin?.name ?? '' }
}

/** The draft with another brand picked: that brand's own plugin id and name come with it. */
export function withBrand(config: PluginConfig, draft: DeployDraft, brand: string): DeployDraft {
  return { ...deployDraftFrom(config, brand), mode: draft.mode }
}

export function pluginIdError(id: string): string | null {
  const value = id.trim()
  return value === '' || PLUGIN_ID.test(value) ? null : 'A Figma plugin id is the long number from that organisation’s manifest.json, e.g. 1686669081925353511.'
}

/** Multi-brand leaves every brand's plugin block alone; single-brand stores the picked brand's. */
export function deployPatchFor(draft: DeployDraft): DeployPatch {
  if (draft.mode === 'multi') return { deploy: { mode: 'multi' } }
  const id = draft.pluginId.trim()
  const name = draft.pluginName.trim()
  return {
    deploy: { mode: 'single', brand: draft.brand },
    figmaPlugin: { [draft.brand]: id || name ? { ...(id ? { id } : {}), ...(name ? { name } : {}) } : null },
  }
}

/** The header button's text: "Multi-brand" or "Gap Inc. only". */
export function deployLabel(config: PluginConfig): string {
  if (config.deploy.mode !== 'single' || !config.deploy.brand) return 'Multi-brand'
  return `${config.brand.brands[config.deploy.brand]?.label ?? config.deploy.brand} only`
}

/** The terminal command that builds and zips this deployment without touching the config. */
export function packageCommand(draft: DeployDraft): string {
  return draft.mode === 'single' ? `BB_DEPLOY=${draft.brand} npm run package` : 'npm run package'
}
