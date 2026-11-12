import process from 'node:process'
import { defineConfig, devices } from '@playwright/test'

// Browser tests, in two projects:
//   smoke  opens the built plugin (dist/index.html, the file Figma loads), so `npm run build` runs first.
//   flows  runs one happy path per tab against the Vite dev server, where every tab has its mock sandbox
//          (the build leaves the Audit and Variable mapper mocks out to stay inside the size budget).
export const DEV_PORT = 5183
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
  projects: [
    { name: 'smoke', testMatch: 'smoke.spec.ts' },
    { name: 'flows', testMatch: 'flows/*.spec.ts', use: { baseURL: `http://localhost:${DEV_PORT}` } },
  ],
  webServer: {
    command: 'npm run dev',
    env: { PORT: String(DEV_PORT) },
    url: `http://localhost:${DEV_PORT}/index.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
