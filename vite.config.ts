import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { fileURLToPath, URL } from 'node:url'
import process from 'node:process'
import { readFileSync } from 'node:fs'
import type { Plugin } from 'vite'

const activeBrand = (JSON.parse(readFileSync(new URL('./plugin.config.json', import.meta.url), 'utf8')) as { brand: { active: string } }).brand.active

// The generated brand CSS is scoped to [data-brand]; stamp the configured brand on <html>.
const brandAttribute = (): Plugin => ({
  name: 'bluebird-brand-attribute',
  transformIndexHtml: (html) => html.replace(/<html([^>]*)data-brand="[^"]*"/, `<html$1data-brand="${activeBrand}"`),
})

// vite-plugin-singlefile inlines exactly one entry, so the two UIs are built
// in two passes: `vite build` (main) and `BB_TARGET=bridge vite build`.
const target = process.env.BB_TARGET === 'bridge' ? 'bridge' : 'index'

// UI build. Produces dist/index.html (main plugin UI) and dist/bridge.html
// (thin WebSocket bridge used in "live" dev mode). Everything is inlined:
// Figma loads the UI from a single HTML string.
export default defineConfig(({ command }) => ({
  plugins: [preact(), tailwindcss(), brandAttribute(), viteSingleFile({ removeViteModuleLoader: true })],
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
      '@features': fileURLToPath(new URL('./src/features', import.meta.url)),
      '@shell': fileURLToPath(new URL('./src/shell', import.meta.url)),
      '@config': fileURLToPath(new URL('./plugin.config.json', import.meta.url)),
      // Every brand's logo ships: the access code picks the brand at runtime. Glyphs stay trimmed
      // to the ones the code references in the plugin build.
      '@logos': fileURLToPath(new URL('./src/shared/ui/BrandLogo/generated.ts', import.meta.url)),
      '@icons': fileURLToPath(new URL(command === 'serve' ? './src/shared/ui/Icon/generated.ts' : './src/shared/ui/Icon/generated.active.ts', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    target: 'es2020',
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    rollupOptions: {
      input: fileURLToPath(new URL(`./${target}.html`, import.meta.url)),
    },
  },
  server: { port: 5173, strictPort: true },
}))
