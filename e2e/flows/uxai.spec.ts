import { expect, test } from '@playwright/test'
import { expectNoProblems, openTab } from '../harness'

test('ux ai: ask a question and get an answer with an artifact', async ({ page }) => {
  const problems = await openTab(page, 'UXAI')
  const main = page.getByRole('main')
  const question = 'What is my primary colour?'

  await main.getByRole('textbox', { name: 'Ask UX AI' }).fill(question)
  await main.getByRole('button', { name: 'Send' }).click()

  const conversation = main.getByRole('log', { name: 'Conversation' })
  await expect(conversation).toContainText(question)
  await expect(conversation.getByRole('article').first()).toBeVisible()
  await expect(main.getByRole('textbox', { name: 'Ask UX AI' })).toHaveValue('')
  expectNoProblems(problems)
})
