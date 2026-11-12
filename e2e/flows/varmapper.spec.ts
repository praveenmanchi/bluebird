import { expect, test } from '@playwright/test'
import { expectNoProblems, openTab } from '../harness'

test('variable mapper: bind a hard-coded value and undo it', async ({ page }) => {
  const problems = await openTab(page, 'Variable mapper')
  const main = page.getByRole('main')
  const row = main.getByRole('article', { name: 'Gap 32 px' })

  await expect(main.getByRole('tablist', { name: 'Category' })).toBeVisible()
  await expect(row).toContainText('Exact')

  await row.getByRole('button', { name: 'Bind Gap 32 px' }).click()
  await expect(row).toContainText('Bound')

  await row.getByRole('button', { name: 'Undo Gap 32 px' }).click()
  await expect(row.getByRole('button', { name: 'Bind Gap 32 px' })).toBeVisible()
  expectNoProblems(problems)
})
