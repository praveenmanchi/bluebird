import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { expect, type Page } from '@playwright/test'

const ROOT = new URL('../', import.meta.url)
const BUILD = fileURLToPath(new URL('dist/index.html', ROOT))

interface PluginConfig {
  brand: { brands: Record<string, unknown> }
  personas: Record<string, { label: string; enabled?: boolean; tabs: string[] }>
  tabs: Record<string, { label: string; enabled: boolean }>
}

export const config = JSON.parse(readFileSync(new URL('plugin.config.json', ROOT), 'utf8')) as PluginConfig
export const BRANDS = Object.keys(config.brand.brands)
export const PERSONAS = Object.entries(config.personas).filter(([, p]) => p.enabled !== false).map(([id]) => id)

export interface Problems {
  /** console.error calls and uncaught exceptions. */
  errors: string[]
  /** Requests that left the page. The mock build should make none besides fonts. */
  requests: string[]
}

export interface OpenOptions { brand: string; persona?: string; signedIn?: boolean }

/** Opens the built plugin with the mock sandbox and records anything that goes wrong while it runs. */
export async function openPlugin(page: Page, { brand, persona, signedIn = true }: OpenOptions): Promise<Problems> {
  if (!existsSync(BUILD)) throw new Error('dist/index.html is missing. Run `npm run build` before the smoke tests.')
  const problems: Problems = { errors: [], requests: [] }
  page.on('pageerror', (e) => problems.errors.push(`uncaught: ${e.message}`))
  page.on('console', (m) => {
    // A blocked request logs its own console error; it is reported through `requests` instead.
    if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) problems.errors.push(`console.error: ${m.text()}`)
  })
  // Keep the run offline: fonts get an empty stylesheet, anything else is blocked and reported.
  await page.route(/^https?:\/\//, (route) => {
    const url = route.request().url()
    if (/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(url)) return route.fulfill({ status: 200, contentType: 'text/css', body: '' })
    problems.requests.push(url)
    return route.abort()
  })
  const query = new URLSearchParams({ mode: 'mock', brand, session: signedIn ? brand : 'none' })
  if (persona) query.set('persona', persona)
  await page.goto(`${pathToFileURL(BUILD).href}?${query.toString()}`)
  return problems
}

/** Signed-in sessions start on the first-run tour; skip it and wait for the tab bar. */
export async function skipTour(page: Page): Promise<void> {
  const tabBar = page.getByRole('navigation', { name: 'Sections' })
  const skip = page.getByRole('button', { name: 'Skip', exact: true })
  await expect(tabBar.or(skip).first()).toBeVisible()
  if (await skip.isVisible()) await skip.click()
  await expect(tabBar).toBeVisible()
}

export function expectNoProblems(problems: Problems): void {
  expect(problems.errors, 'console errors or uncaught exceptions').toEqual([])
  expect(problems.requests, 'network requests from the mock build').toEqual([])
}
