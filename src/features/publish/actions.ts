// The tab's two round trips to the sandbox. UI components call these; they own
// the state transitions so the screens stay declarative.
import type { RpcClient } from '@shared/bridge'
import { MSG, type ExtractResult, type PublishProgress, type PublishRequest, type PublishResult, type StatusResult } from './messages'
import {
  extractError, extractPhase, includedChanges, loadExtract, nextVersion, noteFor, options,
  publishError, publishPhase, publishResult, result, status, statusError, step, steps, title,
} from './state'

const message = (e: unknown, fallback: string) => e instanceof Error && e.message ? e.message : fallback

/** Extracting can take a while on a large library: every page is loaded. */
const EXTRACT_TIMEOUT_MS = 120_000
const PUBLISH_TIMEOUT_MS = 300_000

export async function loadStatus(rpc: RpcClient): Promise<void> {
  statusError.value = null
  try {
    status.value = await rpc.call<StatusResult>(MSG.status)
  } catch (e) {
    statusError.value = message(e, 'Could not read this file’s last release.')
  }
}

export async function runExtract(rpc: RpcClient): Promise<void> {
  if (extractPhase.value === 'extracting') return
  extractPhase.value = 'extracting'
  extractError.value = null
  try {
    loadExtract(await rpc.call<ExtractResult>(MSG.extract, undefined, EXTRACT_TIMEOUT_MS))
  } catch (e) {
    extractPhase.value = 'failed'
    extractError.value = message(e, 'The extract stopped before it finished. Try again.')
  }
}

export function buildRequest(): PublishRequest | null {
  const extract = result.value
  if (!extract) return null
  const picked = includedChanges.value
  return {
    extractId: extract.extractId,
    version: nextVersion.value,
    title: title.value.trim() || nextVersion.value,
    include: picked.map((c) => c.id),
    notes: picked.map((c) => ({ changeId: c.id, text: noteFor(c) })),
    options: options.value,
  }
}

export async function runPublish(rpc: RpcClient): Promise<void> {
  const request = buildRequest()
  if (!request || publishPhase.value === 'running') return
  step.value = 3
  publishPhase.value = 'running'
  publishResult.value = null
  publishError.value = null
  steps.value = []
  const off = rpc.on<PublishProgress>(MSG.progress, (p) => { steps.value = p.steps })
  try {
    const outcome = await rpc.call<PublishResult>(MSG.publish, request, PUBLISH_TIMEOUT_MS)
    steps.value = outcome.steps
    publishResult.value = outcome
    publishPhase.value = outcome.outcome === 'push-rejected' || outcome.outcome === 'build-failed' ? 'failed' : 'done'
  } catch (e) {
    publishPhase.value = 'failed'
    publishError.value = message(e, 'Publishing stopped before it finished. Nothing went live.')
  } finally {
    off()
  }
}
