import { defineConfig } from 'vitest/config'
import preact from '@preact/preset-vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [preact()],
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
      '@features': fileURLToPath(new URL('./src/features', import.meta.url)),
      '@shell': fileURLToPath(new URL('./src/shell', import.meta.url)),
      '@config': fileURLToPath(new URL('./plugin.config.json', import.meta.url)),
      '@logos': fileURLToPath(new URL('./src/shared/ui/BrandLogo/generated.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/**/*.stories.tsx', 'src/**/generated/**', 'src/ui/main.tsx', 'src/ui/bridge.ts', 'src/sandbox/main.ts', 'src/shell/registry.generated.ts'],
      thresholds: { lines: 80, functions: 80, branches: 70, statements: 80 },
    },
  },
})
