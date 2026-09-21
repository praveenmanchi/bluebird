import type { FunctionComponent } from 'preact'

/** What every tab exports from its manifest.ts. */
export interface FeatureManifest {
  /** Must equal the folder name and the key in plugin.config.json → tabs. */
  id: string
  /** Message-type prefix. Convention: same as id. */
  namespace: string
}

/** A bundled tab as seen by the shell (built by the generated registry). */
export interface FeatureEntry {
  manifest: FeatureManifest
  Tab: FunctionComponent
}
