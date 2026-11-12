import { expect, test } from '@playwright/test'
import { expectNoProblems, openTab } from '../harness'

test('variable search: find a variable and see where it is used', async ({ page }) => {
  const problems = await openTab(page, 'Variable search')
  const main = page.getByRole('main')

  await main.getByRole('searchbox', { name: 'Variable name' }).fill('button')
  await main.getByRole('button', { name: 'Search', exact: true }).click()

  await expect(main.getByRole('heading', { name: 'Search results' })).toBeVisible()
  await expect(main.getByRole('article').filter({ hasText: 'button/primary/bg/default' })).toBeVisible()
  await expect(main.getByRole('heading', { name: 'Components using this variable' })).toBeVisible()
  expectNoProblems(problems)
})
