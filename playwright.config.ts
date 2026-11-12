import process from 'node:process'
import { defineConfig, devices } from '@playwright/test'

// Browser smoke tests. They open the built plugin (dist/index.html, the file Figma loads)
// with the in-process mock sandbox, so `npm run build` has to run first.
export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  timeout: 60_000,
  use: {
    ...devices['Desktop Chrome'],
    // The plugin's default window in Figma.
    viewport: { width: 600, height: 760 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
})
