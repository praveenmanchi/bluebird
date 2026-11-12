import { expect, test } from '@playwright/test'
import { expectNoProblems, openTab } from '../harness'

test('audit: run an audit and filter the issues', async ({ page }) => {
  const problems = await openTab(page, 'Audit')
  const main = page.getByRole('main')

  await main.getByRole('button', { name: 'Run audit' }).click()
  await expect(main.getByRole('region', { name: 'Audit summary' })).toBeVisible()
  await expect(main.getByRole('progressbar', { name: 'From the design system' })).toBeVisible()

  const colours = main.getByRole('tablist', { name: 'Issues' }).getByRole('tab', { name: /^Colours \d+/ })
  await colours.click()
  await expect(colours).toHaveAttribute('aria-selected', 'true')
  await expect(main.getByRole('article').first()).toBeVisible()
  expectNoProblems(problems)
})
