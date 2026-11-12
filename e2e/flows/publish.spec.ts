import { expect, test } from '@playwright/test'
import { expectNoProblems, openTab } from '../harness'

test('publish: extract, write release notes, review and publish', async ({ page }) => {
  const problems = await openTab(page, 'Publish')
  const main = page.getByRole('main')

  await main.getByRole('button', { name: 'Run extract' }).click()
  await expect(main.getByRole('heading', { name: /^Changes since v/ })).toBeVisible()
  await expect(main.getByRole('list', { name: 'Changes' }).getByRole('listitem').first()).toBeVisible()

  await main.getByRole('button', { name: /^Next: Release notes/ }).click()
  await expect(main.getByRole('radiogroup', { name: 'Version' })).toBeVisible()
  await expect(main.getByRole('textbox', { name: 'Release title' })).not.toHaveValue('')

  await main.getByRole('button', { name: /^Next/ }).click()
  await expect(main.getByRole('region', { name: 'Final review' })).toBeVisible()

  await main.getByRole('button', { name: /^(Next|Publish)/ }).click()
  await expect(main.getByRole('region', { name: 'Release' })).toBeVisible()
  expectNoProblems(problems)
})
