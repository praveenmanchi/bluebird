import { expect, test } from '@playwright/test'
import { expectNoProblems, openTab } from '../harness'

test('audit: run an audit, read the overview, open a screen and filter what is not mapped', async ({ page }) => {
  const problems = await openTab(page, 'Audit')
  const main = page.getByRole('main')

  await expect(main.getByRole('heading', { name: 'Compared against' })).toBeVisible()
  await main.getByRole('button', { name: 'Run audit on this page' }).click()
  await expect(main.getByRole('region', { name: 'Audit summary' })).toBeVisible()
  await expect(main.getByRole('progressbar', { name: 'Mapped to the design system' })).toBeVisible()
  await expect(main.getByRole('heading', { name: 'By screen' })).toBeVisible()

  await main.getByRole('button', { name: /Error states/ }).click()
  await expect(main.getByRole('region', { name: 'Screen summary' })).toBeVisible()
  await main.getByRole('button', { name: 'All screens' }).click()

  const colours = main.getByRole('tablist', { name: 'Results' }).getByRole('tab', { name: /^Colours \d+/ })
  await colours.click()
  await expect(colours).toHaveAttribute('aria-selected', 'true')
  await expect(main.getByRole('article').first()).toBeVisible()

  await main.getByRole('button', { name: 'View: This scope' }).click()
  await main.getByRole('option', { name: 'Across files' }).click()
  await expect(main.getByText('Across files is coming soon')).toBeVisible()
  expectNoProblems(problems)
})
