// This tab's wire contract. Every type is prefixed with the tab id so it can
// never collide with another tab's messages.
import * as z from 'zod/mini'
import type { AuditResult, ComponentDoc, ComponentSummary, HandoffResult, PageInfo, ProgressStep, Ticket } from './types'

export const MSG = {
  /** What is selected, and the doc stored on it (if any). */
  selection: 'documentation:selection',
  generate: 'documentation:generate',
  /** Pages of this file with their screen and prototype-flow counts. */
  pages: 'documentation:pages',
  audit: 'documentation:audit',
  handoff: 'documentation:handoff',
  /** Open Jira tickets, from Settings › Jira. */
  tickets: 'documentation:tickets',
  /** Comment the hand-off summary on its Jira ticket. */
  post: 'documentation:post',
  /** Select a layer or frame and bring it into view. */
  locate: 'documentation:locate',
  /** Streamed while generate or handoff runs. */
  progress: 'documentation:progress',
} as const

const id = z.string().check(z.minLength(1), z.maxLength(200))
const sectionId = z.enum(['anatomy', 'properties', 'tokens', 'brands', 'a11y', 'code'])

export const generateRequestSchema = z.object({
  nodeId: id,
  sections: z.array(sectionId).check(z.minLength(1)),
  /** Draw the doc frame on this file's Documentation page. */
  frame: z.boolean(),
})
export type GenerateRequest = z.infer<typeof generateRequestSchema>

export const auditRequestSchema = z.object({ pageIds: z.array(id).check(z.minLength(1), z.maxLength(50)) })
export type AuditRequest = z.infer<typeof auditRequestSchema>

export const handoffRequestSchema = z.object({
  pageIds: z.array(id).check(z.minLength(1), z.maxLength(50)),
  ticket: z.nullable(z.object({ key: z.string().check(z.regex(/^[A-Z][A-Z0-9]+-\d+$/)), summary: z.string().check(z.maxLength(300)) })),
  intent: z.string().check(z.maxLength(2000)),
  audience: z.string().check(z.maxLength(60)),
  version: z.string().check(z.maxLength(60)),
  include: z.array(z.enum(['flow', 'screens', 'components', 'issues'])),
  /** Finding ids the designer ignored: listed as known issues. */
  ignored: z.array(id),
})
export type HandoffRequest = z.infer<typeof handoffRequestSchema>

export const postRequestSchema = z.object({ key: z.string().check(z.regex(/^[A-Z][A-Z0-9]+-\d+$/)), text: z.string().check(z.minLength(1), z.maxLength(8000)) })
export const locateRequestSchema = z.object({ nodeId: id })

export type SelectionResult =
  | { status: 'none' }
  | {
    status: 'component'
    component: ComponentSummary
    /** The doc generated earlier for this component. */
    doc: ComponentDoc | null
    /** What changed on the component since `doc`; empty when it is up to date. */
    changes: readonly string[]
  }

export interface PagesResult { pages: readonly PageInfo[] }

export type TicketsResult = { connected: true; tickets: readonly Ticket[] } | { connected: false; problem: string }

export interface Progress { steps: readonly ProgressStep[] }

export type { AuditResult, ComponentDoc, HandoffResult }
