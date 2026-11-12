import { expect, test } from '@playwright/test'
import { expectNoProblems, openTab } from '../harness'

test('extraction: extract, compare and see the changes', async ({ page }) => {
  const problems = await openTab(page, 'Extraction')
  const main = page.getByRole('main')

  await main.getByRole('button', { name: 'Extract', exact: true }).click()

  const changes = main.getByRole('region', { name: 'Variable changes' })
  await expect(changes.getByRole('list', { name: 'Variable changes' }).getByRole('listitem').first()).toBeVisible()
  await expect(main.getByRole('list', { name: 'Impacted components' }).getByRole('listitem').first()).toBeVisible()

  const added = changes.getByRole('tab', { name: /^Added \d+/ })
  await added.click()
  await expect(added).toHaveAttribute('aria-selected', 'true')

  const push = main.getByRole('region', { name: 'Push and pull request' })
  await expect(push.getByRole('textbox', { name: 'Commit message' })).toHaveValue(/variable changes/)
  await expect(push.getByRole('button', { name: 'Push to branch' })).toBeEnabled()
  expectNoProblems(problems)
})
