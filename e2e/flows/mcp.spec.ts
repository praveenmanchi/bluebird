import { expect, test } from '@playwright/test'
import { expectNoProblems, openTab } from '../harness'

test('mcp handoff: select, check, generate and reach ship', async ({ page }) => {
  const problems = await openTab(page, 'MCP handoff')
  const main = page.getByRole('main')

  await expect(main.getByRole('region', { name: 'Selection' })).toBeVisible()
  await main.getByRole('button', { name: 'Next: Check' }).click()
  await expect(main.getByRole('progressbar', { name: 'Readiness score' })).toBeVisible()

  await main.getByRole('button', { name: 'Next: Generate' }).click()
  await expect(main.getByRole('tablist', { name: 'Generated files' }).getByRole('tab').first()).toBeVisible()
  await expect(main.getByRole('tabpanel').getByRole('code')).not.toBeEmpty()

  await main.getByRole('button', { name: 'Next: Ship' }).click()
  await expect(main.getByRole('region', { name: 'Ship to Git' }).getByRole('textbox', { name: 'Branch' })).not.toHaveValue('')
  await expect(main.getByRole('button', { name: 'Push and open PR' })).toBeEnabled()
  expectNoProblems(problems)
})
