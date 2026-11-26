import { expect, test } from '@playwright/test'
import { BRANDS, PERSONAS, config, expectNoProblems, openPlugin, skipTour } from './harness'

// Smoke tests: every tab of every persona opens in every brand, shows something, and
// logs no error. They catch a blank or crashing tab; what a tab does is for its own tests.

for (const brand of BRANDS) {
  test.describe(`brand ${brand}`, () => {
    test('login screen renders', async ({ page }) => {
      const problems = await openPlugin(page, { brand, signedIn: false })
      await expect(page.getByRole('textbox').first()).toBeVisible()
      await expect(page.getByRole('navigation', { name: 'Sections' })).toHaveCount(0)
      expectNoProblems(problems)
    })

    for (const persona of PERSONAS) {
      test(`${persona}: every tab opens`, async ({ page }) => {
        const problems = await openPlugin(page, { brand, persona })
        await skipTour(page)

        const tabs = page.getByRole('navigation', { name: 'Sections' }).getByRole('tab')
        const labels = (await tabs.allInnerTexts()).map((t) => t.trim())
        expect(labels.length, 'tabs in the tab bar').toBeGreaterThan(0)

        const main = page.getByRole('main')
        for (const label of labels) {
          await test.step(label, async () => {
            const tab = tabs.filter({ hasText: label }).first()
            await tab.click()
            await expect(tab).toHaveAttribute('aria-selected', 'true')
            await expect(main, `${label} shows content`).not.toBeEmpty()
            await expect(main, `${label} shows text`).toHaveText(/\S/)
            await expect(main).not.toContainText('No tabs enabled')
            expect(problems.errors, `errors after opening ${label}`).toEqual([])
          })
        }

        await test.step('Settings', async () => {
          await page.getByRole('navigation', { name: 'Sections' }).getByRole('button', { name: /settings/i }).click()
          await expect(main).toHaveText(/\S/)
        })
        expectNoProblems(problems)
      })
    }
  })
}

test('every enabled tab is reachable from some persona', async ({ page }) => {
  // A brand without its own tabs/personas gets the defaults, so the active brand stands in for all of them.
  const { active, brands: all } = config.brand as { active?: string; brands: Record<string, { tabs?: unknown; personas?: unknown }> }
  const brands = BRANDS.filter((id) => id === active || all[id]?.tabs || all[id]?.personas)
  const seen = new Set<string>()
  for (const brand of brands) {
    for (const persona of PERSONAS) {
      await openPlugin(page, { brand, persona })
      await skipTour(page)
      for (const label of await page.getByRole('navigation', { name: 'Sections' }).getByRole('tab').allInnerTexts()) seen.add(label.trim())
    }
  }
  const listed = new Set(Object.values(config.personas).filter((p) => p.enabled !== false).flatMap((p) => p.tabs))
  const expected = Object.entries(config.tabs).filter(([id, tab]) => tab.enabled && listed.has(id)).map(([, tab]) => tab.label)
  expect([...seen].sort()).toEqual(expect.arrayContaining(expected.sort()))
})
