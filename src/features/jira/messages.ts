// This tab's wire contract. The sandbox owns the Jira connection (Settings ›
// Jira Integration lives in clientStorage there) and makes every Jira call;
// no Jira message carries the token. Every write answers with the issue
// re-read from Jira.
import * as z from 'zod/mini'
import type { Person, Ticket } from './types'

export const MSG = {
  /** Who is signed in plus every ticket on the board — or why there is no connection. */
  load: 'jira:load',
  /** One issue with its detail (comments, history, work log, Figma links). */
  issue: 'jira:issue',
  status: 'jira:status',
  points: 'jira:points',
  comment: 'jira:comment',
  commentEdit: 'jira:comment-edit',
  commentDelete: 'jira:comment-delete',
  worklog: 'jira:worklog',
  /** Attach the current Figma selection to the issue as a remote link. */
  link: 'jira:link',
  subtask: 'jira:subtask',
  /** Settings › Test Connection: the form's unsaved Jira values → who the token signs in as. Equals testMessage('jira'). */
  test: 'jira:test',
  /** Open a Jira (or Figma) URL in the browser. */
  open: 'jira:open',
  /** Select a linked frame in Figma and scroll it into view. */
  focus: 'jira:focus',
  /** Read the current Figma selection so it can be attached to the issue as a link. */
  selection: 'jira:selection',
} as const

const key = z.string().check(z.regex(/^[A-Z][A-Z0-9_]*-\d+$/))
const status = z.enum(['todo', 'in-progress', 'in-review', 'done'])

export const keyRequestSchema = z.object({ key })
export const statusRequestSchema = z.object({ key, status })
export const pointsRequestSchema = z.object({ key, points: z.number().check(z.gte(0), z.lte(1000)) })
const body = z.string().check(z.trim(), z.minLength(1), z.maxLength(32_000))
/** Jira comment ids are numeric; fixtures use short ids. Never `.` or `/`, which would change the URL path. */
const commentId = z.string().check(z.regex(/^[A-Za-z0-9_-]{1,64}$/))
export const commentRequestSchema = z.object({ key, body })
export const commentEditRequestSchema = z.object({ key, id: commentId, body })
export const commentDeleteRequestSchema = z.object({ key, id: commentId })
/** Work logged from "Log work"; one hour by default. */
export const worklogRequestSchema = z.object({ key, seconds: z.number().check(z.gte(60), z.lte(86_400)) })
/** `subtaskKey` is the subtask's issue key in Jira (fixtures use short ids). */
export const subtaskRequestSchema = z.object({ key, subtaskKey: z.string().check(z.regex(/^[A-Za-z0-9_-]{1,64}$/)), done: z.boolean() })
export const openRequestSchema = z.object({ url: z.string().check(z.regex(/^https:\/\/\S+$/)) })
export const focusRequestSchema = z.object({ nodeId: z.string().check(z.minLength(1)) })
export type FocusRequest = z.infer<typeof focusRequestSchema>

/** Why the board can't load: Jira switched off / not filled in (→ Settings), or Jira failed (→ Retry). */
export type LoadResult =
  | { status: 'connected'; site: string; me: Person; tickets: Ticket[]; activeSprint: string | null; syncedAt: number; truncated: boolean }
  | { status: 'not-connected'; reason: 'disabled' | 'incomplete' | 'invalid'; missing: string[] }

/** The frame the designer has selected, in the shape a Figma Link Card shows. */
export interface SelectionLink {
  nodeId: string
  /** Figma Link Card "Frame". */
  frame: string
  /** Figma Link Card "Path": file › page. */
  path: string
  /** figma.com link to the frame; null when Figma doesn't expose the file key to this plugin. */
  url: string | null
}
