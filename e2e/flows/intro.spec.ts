import { expect, test } from '@playwright/test'
import { expectNoProblems, openPlugin, skipTour } from '../harness'

test('intros: the layout intro, then the open tab’s intro, then the footer replays it', async ({ page }) => {
  const problems = await openPlugin(page, { brand: 'gap', persona: 'design-system', target: 'dev', intros: 'pending' })
  await skipTour(page)

  const layout = page.getByRole('dialog', { name: 'Plugin layout intro' })
  await expect(layout).toBeVisible()
  await expect(layout.getByRole('heading', { name: 'Your tabs' })).toBeVisible()
  await layout.getByRole('button', { name: 'Start' }).click()
  await expect(layout.getByRole('heading', { name: 'Settings' })).toBeVisible()
  await page.getByRole('button', { name: /Skip tour/ }).click()

  const tabIntro = page.getByRole('dialog', { name: /intro$/ })
  await expect(tabIntro.getByRole('heading', { name: /^Welcome to / })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await page.getByRole('button', { name: 'Show tab intro' }).click()
  await expect(page.getByRole('dialog', { name: /intro$/ }).getByRole('heading', { name: /^Welcome to / })).toBeVisible()
  expectNoProblems(problems)
})
