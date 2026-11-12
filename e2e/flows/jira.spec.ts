import { expect, test } from '@playwright/test'
import { expectNoProblems, openTab } from '../harness'

test('jira: pick a ticket and see its details', async ({ page }) => {
  const problems = await openTab(page, 'Jira board')
  const main = page.getByRole('main')

  const ticket = main.getByRole('region', { name: 'My tickets' }).getByRole('button', { name: /BB-138/ })
  await ticket.click()
  await expect(ticket).toHaveAttribute('aria-pressed', 'true')
  await expect(main.getByRole('heading', { name: /Focus ring disappears on Dropdown/, level: 2 })).toBeVisible()
  await expect(main.getByRole('heading', { name: 'Description' })).toBeVisible()
  expectNoProblems(problems)
})
