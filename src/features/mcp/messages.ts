// This tab's wire contract. Every type is prefixed with the tab id so it can
// never collide with another tab's messages. The handoff itself (MCP reads, code
// generation, Git push) is UI-only on fixtures for now; the real messages select
// the linked frame in Figma and open the pull request / Jira issue in the browser.
import * as z from 'zod/mini'

export const MSG = {
  focus: 'mcp:focus',
  open: 'mcp:open',
} as const

export const focusRequestSchema = z.object({ nodeId: z.string().check(z.minLength(1)) })
export type FocusRequest = z.infer<typeof focusRequestSchema>

/** Pull request and Jira links: https only, never javascript:/data: URLs. */
export const openRequestSchema = z.object({
  url: z.string().check(z.maxLength(2048), z.regex(/^https:\/\/[^\s/]+\//, 'Only https links can be opened')),
})
export type OpenRequest = z.infer<typeof openRequestSchema>
