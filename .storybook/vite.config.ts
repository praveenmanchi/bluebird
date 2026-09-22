// Storybook's own Vite config: same aliases and CSS pipeline as the plugin,
// without the single-file inlining used for the Figma bundle.
import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [preact(), tailwindcss()],
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('../src/shared', import.meta.url)),
      '@features': fileURLToPath(new URL('../src/features', import.meta.url)),
      '@shell': fileURLToPath(new URL('../src/shell', import.meta.url)),
      '@config': fileURLToPath(new URL('../plugin.config.json', import.meta.url)),
      '@logos': fileURLToPath(new URL('../src/shared/ui/BrandLogo/generated.ts', import.meta.url)),
      '@icons': fileURLToPath(new URL('../src/shared/ui/Icon/generated.ts', import.meta.url)),
    },
  },
})
