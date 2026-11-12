import { expect, test } from '@playwright/test'
import { expectNoProblems, openTab } from '../harness'

test('agents: run all agents and open the first result', async ({ page }) => {
  const problems = await openTab(page, 'UX AI agents')
  const main = page.getByRole('main')

  await main.getByRole('button', { name: 'Run all on scope' }).click()
  await expect(main.getByRole('heading', { name: 'Running all agents' })).toBeVisible()
  await expect(main.getByRole('list', { name: 'Pipeline' }).getByRole('listitem')).toHaveCount(6)
  await expect(main.getByRole('progressbar', { name: 'All agents progress' })).toBeVisible()

  // The mock agents finish one after another; the first result is enough for a happy path.
  await expect(main.getByRole('button', { name: 'Open Accessibility results' })).toBeVisible({ timeout: 20_000 })
  expectNoProblems(problems)
})
