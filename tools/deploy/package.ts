// What `npm run package` writes: the plugin's manifest and built files, ready to import in Figma.
// A single-brand package carries that brand's Figma plugin id and name when the config has them.
import { loadConfig } from '../../src/shared/config/load'
import type { Deploy } from './deploy'

export type Manifest = Record<string, unknown> & { id?: unknown; name?: unknown }

export interface PackagePlan {
  /** release/<slug>/ and release/bluebird-<slug>.zip */
  slug: string
  manifest: Manifest
  /** Things to tell the person packaging, e.g. the plugin id still being this repo's. */
  notes: string[]
}

/** Built files every manifest references, relative to the repo root. */
export const PACKAGE_FILES = ['dist/code.js', 'dist/index.html', 'dist/bridge.html'] as const

export function planPackage(manifest: Manifest, raw: unknown, deploy: Deploy): PackagePlan {
  if (deploy.mode === 'multi') return { slug: 'multi-brand', manifest, notes: [] }
  const brand = loadConfig(raw).brand.brands[deploy.brand]
  const plugin = brand?.figmaPlugin
  const label = brand?.label ?? deploy.brand
  const notes = plugin?.id ? [] : [
    `No Figma plugin ID is set for ${label}, so the package keeps this repo's id (${String(manifest.id)}). ` +
    `Publishing in ${label}'s organisation needs an id that its Figma created: Plugins › Development › New plugin there, ` +
    'then paste the id into dev.html › Plugin configuration › Deployment (or brand.brands.' + deploy.brand + '.figmaPlugin.id) and package again.',
  ]
  return {
    slug: deploy.brand,
    manifest: { ...manifest, ...(plugin?.id ? { id: plugin.id } : {}), ...(plugin?.name ? { name: plugin.name } : {}) },
    notes,
  }
}

/** HOW-TO-PUBLISH.txt in the zip: the steps on the machine that publishes. */
export function publishSteps(plan: PackagePlan, label: string): string {
  return [
    `${String(plan.manifest.name)} — ${label}`,
    '',
    'To publish in Figma:',
    '1. Unzip this folder anywhere on the computer.',
    '2. In the Figma desktop app: Plugins › Development › Import plugin from manifest…, and pick manifest.json in this folder.',
    '3. Run it once from Plugins › Development to check it opens.',
    '4. Plugins › Development › Manage plugins in development, then Publish on this plugin and choose your organisation (private).',
    '',
    'Updating later: import the new package over the old folder and publish again with the same plugin id.',
    '',
  ].join('\n')
}
