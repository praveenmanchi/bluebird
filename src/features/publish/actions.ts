// The tab's round trips to the sandbox. UI components call these; they own
// the state transitions so the screens stay declarative.
import type { RpcClient } from '@shared/bridge'
import { MSG, type CommitPreview, type ExtractResult, type PublishProgress, type PublishRequest, type PublishResult, type StatusResult } from './messages'
import {
  extractError, extractPhase, includedChanges, loadExtract, nextVersion, noteFor, options, preview, previewError, previewFile,
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

/** Teams is only asked for when Settings › Notifications holds a webhook to post to. */
export const canPostToTeams = (): boolean => (status.value?.notify.webhooks ?? 0) > 0

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
    options: { ...options.value, postToTeams: options.value.postToTeams && canPostToTeams() },
  }
}

/** The Final review's "Commit contents": what the publish commit would carry, as it stands now. */
export async function loadPreview(rpc: RpcClient): Promise<void> {
  const request = buildRequest()
  if (!request) return
  previewError.value = null
  try {
    const next = await rpc.call<CommitPreview>(MSG.preview, request)
    preview.value = next
    if (!next.files.some((f) => f.path === previewFile.value)) previewFile.value = null
  } catch (e) {
    preview.value = null
    previewError.value = message(e, 'Couldn’t build the commit preview.')
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
