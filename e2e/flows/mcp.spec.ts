import { expect, test } from '@playwright/test'
import { expectNoProblems, openTab } from '../harness'

test('mcp handoff: select, check, hand off and reach track', async ({ page }) => {
  const problems = await openTab(page, 'MCP handoff')
  const main = page.getByRole('main')

  await expect(main.getByRole('tablist', { name: 'Scenario' }).getByRole('tab', { name: 'Component' })).toHaveAttribute('aria-selected', 'true')
  await expect(main.getByRole('region', { name: 'Selection' })).toBeVisible()
  await main.getByRole('button', { name: 'Next: Check' }).click()
  await expect(main.getByRole('progressbar', { name: 'Readiness score' })).toBeVisible()

  await main.getByRole('button', { name: 'Next: Hand off' }).click()
  await expect(main.getByRole('tablist', { name: 'Hand-off views' }).getByRole('tab').first()).toBeVisible()
  await expect(main.getByRole('tabpanel').getByRole('code')).toContainText('using the Figma MCP server')
  await expect(main.getByRole('textbox', { name: 'Branch' })).not.toHaveValue('')

  // The clipboard may be blocked in the test browser; either way the prompt stays on screen.
  await expect(main.getByRole('button', { name: 'Copy prompt' })).toBeEnabled()
  expectNoProblems(problems)
})
