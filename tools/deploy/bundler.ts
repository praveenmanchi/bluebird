// Hooks the single-brand helpers into the two bundlers. Both read plugin.config.json plus
// BB_DEPLOY once per build; in multi-brand mode they do nothing at all.
//   vite (dist/index.html): the config, the logo table and the brand list are rewritten as they
//     load, and the other brands' CSS rules are dropped from the built stylesheet.
//   esbuild (dist/code.js): the config and the brand list are rewritten as they load.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin as EsbuildPlugin } from 'esbuild'
import type { Plugin as VitePlugin } from 'vite'
import { otherBrands, resolveDeploy, singleBrandConfig, stripBrandCss, stripBrandCssInHtml, stripLogos, stripTokenBrands, type Deploy } from './deploy'

export interface DeployFiles {
  config: string
  logos: string
  tokens: string
}

export const deployFiles = (root: string): DeployFiles => ({
  config: resolve(root, 'plugin.config.json'),
  logos: resolve(root, 'src/shared/ui/BrandLogo/generated.ts'),
  tokens: resolve(root, 'src/shared/brand/generated/tokens.ts'),
})

export interface DeployPlan {
  deploy: Deploy
  /** Source rewrites by absolute path; empty in multi-brand mode. */
  rewrites: Map<string, () => string>
  others: string[]
}

/** Reads the config once and works out what this build ships. */
export function planDeploy(root: string, env: Readonly<Record<string, string | undefined>> = process.env): DeployPlan {
  const files = deployFiles(root)
  const raw = JSON.parse(readFileSync(files.config, 'utf8')) as unknown
  const deploy = resolveDeploy(raw, env)
  if (deploy.mode === 'multi') return { deploy, rewrites: new Map(), others: [] }
  const others = otherBrands(raw, deploy.brand)
  const read = (path: string) => readFileSync(path, 'utf8')
  return {
    deploy,
    others,
    rewrites: new Map([
      [files.config, () => JSON.stringify(singleBrandConfig(raw, deploy.brand))],
      [files.logos, () => stripLogos(read(files.logos), others)],
      [files.tokens, () => stripTokenBrands(read(files.tokens), others)],
    ]),
  }
}

const clean = (id: string): string => id.split('?')[0]!

export const describeDeploy = (deploy: Deploy): string =>
  deploy.mode === 'single' ? `single brand: ${deploy.brand} (no sign-in, other brands stripped)` : 'multi-brand (access code picks the brand)'

/** vite build only: the dev server and Storybook always see every brand. */
export function deployVitePlugin(plan: DeployPlan): VitePlugin {
  return {
    name: 'bluebird-deploy',
    apply: 'build',
    enforce: 'pre',
    buildStart() {
      this.info(`[deploy] ${describeDeploy(plan.deploy)}`)
    },
    load(id) {
      const rewrite = plan.rewrites.get(clean(id))
      return rewrite ? rewrite() : null
    },
    // Last, after Vite has emitted the stylesheet and vite-plugin-singlefile has inlined it into the page.
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        if (!plan.others.length) return
        for (const file of Object.values(bundle)) {
          if (file.type !== 'asset' || typeof file.source !== 'string') continue
          if (file.fileName.endsWith('.css')) file.source = stripBrandCss(file.source, plan.others)
          else if (file.fileName.endsWith('.html')) file.source = stripBrandCssInHtml(file.source, plan.others)
        }
      },
    },
  }
}

/** esbuild (dist/code.js): same source rewrites, as an onLoad hook. */
export function deployEsbuildPlugin(plan: DeployPlan): EsbuildPlugin {
  return {
    name: 'bluebird-deploy',
    setup(build) {
      if (!plan.rewrites.size) return
      build.onLoad({ filter: /(plugin\.config\.json|generated[\\/]tokens\.ts|BrandLogo[\\/]generated\.ts)$/ }, (args) => {
        const rewrite = plan.rewrites.get(args.path)
        if (!rewrite) return undefined
        return { contents: rewrite(), loader: args.path.endsWith('.json') ? 'json' : 'ts' }
      })
    },
  }
}
