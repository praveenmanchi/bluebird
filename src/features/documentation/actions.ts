// The tab's round trips to the sandbox. UI components call these; they own
// the state transitions so the screens stay declarative.
import type { RpcClient } from '@shared/bridge'
import { copyText } from '@shared/clipboard'
import { MSG, type GenerateRequest, type HandoffRequest, type PagesResult, type SelectionResult, type TicketsResult } from './messages'
import { docMarkdown } from './model'
import * as s from './state'
import type { AuditResult, ComponentDoc, HandoffResult } from './types'

const text = (e: unknown, fallback: string) => e instanceof Error && e.message ? e.message : fallback

/** Reading every page of a large file, and drawing on the canvas, can take a while. */
const LONG_TIMEOUT_MS = 120_000

/** Bumped by Cancel: an answer that arrives for an older run is dropped. */
let run = 0

export async function refreshSelection(rpc: RpcClient): Promise<void> {
  // A generate in flight keeps its screen; its own answer moves it on.
  if (s.componentPhase.value === 'generating') return
  try {
    s.loadSelection(await rpc.call<SelectionResult>(MSG.selection))
  } catch (e) {
    s.componentError.value = text(e, 'Couldn’t read the selection.')
    s.componentPhase.value = 'failed'
  }
}

export async function runGenerate(rpc: RpcClient): Promise<void> {
  const target = s.component.value
  if (!target || s.componentPhase.value === 'generating' || s.sections.value.size === 0) return
  const mine = ++run
  s.progress.value = []
  s.componentError.value = null
  s.notice.value = null
  s.componentPhase.value = 'generating'
  const request: GenerateRequest = { nodeId: target.nodeId, sections: [...s.sections.value], frame: s.drawFrame.value }
  try {
    const result = await rpc.call<ComponentDoc>(MSG.generate, request, LONG_TIMEOUT_MS)
    if (mine !== run) return
    s.doc.value = result
    s.changes.value = []
    s.componentPhase.value = 'result'
  } catch (e) {
    if (mine !== run) return
    s.componentError.value = text(e, 'The doc stopped before it finished. Try again.')
    s.componentPhase.value = 'failed'
  }
}

/** Cancel on the Generating screens: the sandbox finishes on its own; its answer is ignored. */
export function cancelRun(): void {
  run += 1
  if (s.componentPhase.value === 'generating') s.componentPhase.value = 'configure'
  if (s.handoffPhase.value === 'building') s.handoffPhase.value = 'details'
}

export async function copyMarkdown(): Promise<void> {
  if (!s.doc.value) return
  s.notice.value = await copyText(docMarkdown(s.doc.value)) ? 'Markdown copied' : 'Couldn’t copy. Select the doc frame on the canvas instead.'
}

export function locate(rpc: RpcClient, nodeId: string): void {
  rpc.call(MSG.locate, { nodeId }).catch((e: unknown) => { s.notice.value = text(e, 'Couldn’t find that layer.') })
}

export async function loadPages(rpc: RpcClient): Promise<void> {
  s.handoffError.value = null
  s.handoffPhase.value = 'loading'
  try {
    const result = await rpc.call<PagesResult>(MSG.pages, undefined, LONG_TIMEOUT_MS)
    s.pages.value = result.pages
    s.picked.value = new Set([...s.picked.value].filter((id) => result.pages.some((p) => p.id === id)))
    s.handoffPhase.value = 'pages'
  } catch (e) {
    s.handoffError.value = text(e, 'Couldn’t read this file’s pages.')
    s.handoffPhase.value = 'failed'
  }
}

export async function runAudit(rpc: RpcClient): Promise<void> {
  if (!s.picked.value.size || s.handoffPhase.value === 'auditing') return
  s.handoffError.value = null
  s.handoffPhase.value = 'auditing'
  try {
    const result = await rpc.call<AuditResult>(MSG.audit, { pageIds: s.pickedPages.value.map((p) => p.id) }, LONG_TIMEOUT_MS)
    s.audit.value = result
    s.ignored.value = new Set()
    // No links anywhere: say so before the audit, so "canvas order" is a choice and not a surprise.
    s.handoffPhase.value = result.links === 0 ? 'no-prototype' : 'audit'
  } catch (e) {
    s.handoffError.value = text(e, 'The check stopped before it finished. Try again.')
    s.handoffPhase.value = 'failed'
  }
}

export async function openDetails(rpc: RpcClient): Promise<void> {
  s.handoffPhase.value = 'details'
  if (s.tickets.value !== null) return
  try {
    const result = await rpc.call<TicketsResult>(MSG.tickets)
    s.tickets.value = result.connected ? result.tickets : result.problem
  } catch (e) {
    s.tickets.value = text(e, 'Couldn’t reach Jira.')
  }
}

export async function runHandoff(rpc: RpcClient): Promise<void> {
  if (s.handoffPhase.value === 'building') return
  const mine = ++run
  s.progress.value = []
  s.handoffError.value = null
  s.postState.value = 'idle'
  s.handoffPhase.value = 'building'
  const request: HandoffRequest = {
    pageIds: s.pickedPages.value.map((p) => p.id),
    ticket: s.ticket.value ? { key: s.ticket.value.key, summary: s.ticket.value.summary } : null,
    intent: s.intent.value, audience: s.audience.value, version: s.version.value,
    include: [...s.include.value], ignored: [...s.ignored.value],
  }
  try {
    const result = await rpc.call<HandoffResult>(MSG.handoff, request, LONG_TIMEOUT_MS)
    if (mine !== run) return
    s.handoff.value = result
    s.handoffPhase.value = 'result'
  } catch (e) {
    if (mine !== run) return
    s.handoffError.value = text(e, 'The hand-off stopped before it finished. Try again.')
    s.handoffPhase.value = 'failed'
  }
}

export async function postToJira(rpc: RpcClient): Promise<void> {
  const result = s.handoff.value
  if (!result?.ticket || s.postState.value === 'posting') return
  s.postState.value = 'posting'
  try {
    await rpc.call(MSG.post, { key: result.ticket, text: result.summary })
    s.postState.value = 'posted'
  } catch (e) {
    s.postState.value = { error: text(e, 'Jira didn’t accept the comment.') }
  }
}
