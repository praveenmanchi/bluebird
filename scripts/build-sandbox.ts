// Bundles the Figma sandbox entry (src/sandbox/main.ts) into dist/code.js.
// BB_LIVE=1 (npm run dev:live) builds the live-mode variant: running the plugin opens the
// bridge panel instead of the UI. Every other build, `npm run build` included, leaves it out.
import { build, context, type BuildOptions } from 'esbuild'
import { resolve } from 'node:path'
import { mkdirSync } from 'node:fs'

const root = resolve(import.meta.dirname, '..')
const watch = process.argv.includes('--watch')
const live = process.env.BB_LIVE === '1'

const options: BuildOptions = {
  entryPoints: [resolve(root, 'src/sandbox/main.ts')],
  outfile: resolve(root, 'dist/code.js'),
  bundle: true,
  format: 'iife',
  target: 'es2020',
  platform: 'browser',
  minify: !watch,
  sourcemap: watch ? 'inline' : false,
  logLevel: 'info',
  define: { __LIVE_BRIDGE__: JSON.stringify(live) },
  alias: {
    '@shared': resolve(root, 'src/shared'),
    '@features': resolve(root, 'src/features'),
    '@shell': resolve(root, 'src/shell'),
    '@config': resolve(root, 'plugin.config.json'),
  },
}

mkdirSync(resolve(root, 'dist'), { recursive: true })
if (watch) {
  const ctx = await context(options)
  await ctx.watch()
  console.log(live
    ? '[sandbox] LIVE build: running the plugin opens the bridge panel. Run npm run build before publishing.'
    : '[sandbox] watching… re-run the plugin in Figma (Cmd+Opt+P) after each change')
} else {
  await build(options)
}
