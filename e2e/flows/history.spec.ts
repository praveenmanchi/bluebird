import { expect, test } from '@playwright/test'
import { expectNoProblems, openTab } from '../harness'

test('history: filter the timeline, open an entry and go back', async ({ page }) => {
  const problems = await openTab(page, 'History')
  const main = page.getByRole('main')
  const timeline = main.getByRole('region', { name: 'Team history' })

  await expect(main.getByRole('article').first()).toBeVisible()

  const extraction = timeline.getByRole('tab', { name: /^Extraction \d+/ })
  await extraction.click()
  await expect(extraction).toHaveAttribute('aria-selected', 'true')
  for (const name of await main.getByRole('article').evaluateAll((els) => els.map((el) => el.getAttribute('aria-label') ?? ''))) expect(name).toMatch(/^Extraction:/)

  await timeline.getByRole('tab', { name: /^All \d+/ }).click()
  await main.getByRole('button', { name: 'View details: Login screen' }).click()
  await expect(main.getByRole('heading', { name: 'Login screen', level: 2 })).toBeVisible()
  await expect(main.getByRole('region', { name: 'Issues' })).toBeVisible()

  await main.getByRole('button', { name: /Back to history/ }).click()
  await expect(timeline).toBeVisible()
  expectNoProblems(problems)
})
