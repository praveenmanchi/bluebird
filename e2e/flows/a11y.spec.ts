import { expect, test } from '@playwright/test'
import { expectNoProblems, openTab } from '../harness'

test('accessibility: scan and filter the findings', async ({ page }) => {
  const problems = await openTab(page, 'Accessibility')
  const main = page.getByRole('main')

  await main.getByRole('button', { name: 'Scan', exact: true }).click()
  await expect(main.getByRole('region', { name: 'Scan summary' })).toBeVisible()

  const findings = main.getByRole('region', { name: 'Findings' })
  await expect(findings.getByRole('article').first()).toBeVisible()

  const contrast = findings.getByRole('tab', { name: /^Contrast \d+/ })
  await contrast.click()
  await expect(contrast).toHaveAttribute('aria-selected', 'true')
  await expect(findings.getByRole('article').first()).toContainText('1.4.3')
  expectNoProblems(problems)
})
