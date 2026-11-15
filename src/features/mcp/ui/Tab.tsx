import { useEffect, useRef } from 'preact/hooks'
import { useRpc } from '@shared/ui'
import { MSG, type CheckResult, type ImpactResult, type McpStatus, type ReleasesResult, type SelectionResult, type TrackResult } from '../messages'
import { namesToFind } from '../library'
import {
  applySelection, applyStatus, branch, checkError, checkPhase, checkResult, impactError, impactPhase, impactResult, kind, notice, release, releaseId, releases,
  releasesPhase, releasesProblem, reset, selectRelease, clearLibrary, selection, selectionError, selectionPhase, step, trackEpoch, trackError, trackPhase, trackResult, trackedBranches,
} from '../state'
import { McpHandoff } from './McpHandoff'

/** Checking walks the selection layer by layer; a large screen takes a few seconds. */
const CHECK_TIMEOUT_MS = 60_000
/** The impact scan walks every page of the file. */
const IMPACT_TIMEOUT_MS = 120_000
/** How often Track asks GitHub again while the tab is open on a hand-off without a pull request. */
export const TRACK_EVERY_MS = 30_000

/**
 * MCP handoff tab: Select → Check → Hand off → Track (Figma "MCP flow v3 · 600").
 * The selection, the readiness checks, each scenario's repository and the pull-request
 * lookup come from the sandbox; the code is written by Claude Code from the copied prompt.
 */
export function Tab() {
  const rpc = useRpc()
  /** Only the newest release load and scan may write: a Refresh or Scan again overtakes the one before. */
  const releaseLoads = useRef(0)
  const scans = useRef(0)

  const fail = (fallback: string) => (e: unknown) => { notice.value = e instanceof Error ? e.message : fallback }

  useEffect(() => {
    let live = 0
    selection.value = null
    selectionPhase.value = 'loading'
    clearLibrary()
    const read = async () => {
      const mine = ++live
      try {
        const result = await rpc.call<SelectionResult>(MSG.selection)
        if (mine !== live) return
        applySelection(result)
      } catch (e) {
        if (mine !== live) return
        selectionPhase.value = 'failed'
        selectionError.value = e instanceof Error ? e.message : 'Could not read the selection'
      }
    }
    void read()
    rpc.call<McpStatus>(MSG.status).then((s) => { if (live >= 0) applyStatus(s) }).catch(() => undefined)
    const off = rpc.on('shell:selection', () => { void read() })
    return () => { off(); live = -1; reset() }
  }, [rpc])

  async function check(nodeId: string) {
    checkPhase.value = 'loading'
    checkError.value = null
    try {
      const result = await rpc.call<CheckResult>(MSG.check, { nodeId }, CHECK_TIMEOUT_MS)
      if (selection.value?.nodeId !== nodeId) return // the canvas moved on meanwhile
      checkResult.value = result
      checkPhase.value = 'done'
    } catch (e) {
      if (selection.value?.nodeId !== nodeId) return
      checkPhase.value = 'failed'
      checkError.value = e instanceof Error ? e.message : 'The checks could not run'
    }
  }

  /** Library update: the releases in the team History (Settings › Storage). Keeps the picked one when it is still listed. */
  async function loadReleases() {
    const mine = ++releaseLoads.current
    releasesPhase.value = 'loading'
    releasesProblem.value = null
    try {
      const result = await rpc.call<ReleasesResult>(MSG.releases, null, IMPACT_TIMEOUT_MS)
      if (mine !== releaseLoads.current) return
      releases.value = result.releases
      releasesProblem.value = result.problem ?? null
      // The picked release is gone: pick the newest, which also drops the old release's screens.
      if (!result.releases.some((r) => r.id === releaseId.value)) {
        const next = result.releases[0]
        if (next) selectRelease(next.id)
        else releaseId.value = null
      }
      releasesPhase.value = 'done'
    } catch (e) {
      if (mine !== releaseLoads.current) return
      releasesPhase.value = 'failed'
      releasesProblem.value = e instanceof Error ? e.message : 'The team History could not be read'
    }
  }

  /** Library update: the screens in this file that use the picked release's components. */
  async function scanImpact() {
    const r = release.value
    if (!r) return
    const names = namesToFind(r)
    if (!names.length) { impactResult.value = { screens: [], pages: 0, scanned: 0, truncated: false }; impactPhase.value = 'done'; return }
    const mine = ++scans.current
    const stale = () => mine !== scans.current || release.value?.id !== r.id // a newer scan, or another release
    impactPhase.value = 'loading'
    impactError.value = null
    try {
      const result = await rpc.call<ImpactResult>(MSG.impact, { components: names }, IMPACT_TIMEOUT_MS)
      if (stale()) return
      impactResult.value = result
      impactPhase.value = 'done'
    } catch (e) {
      if (stale()) return
      impactPhase.value = 'failed'
      impactError.value = e instanceof Error ? e.message : 'The file could not be scanned'
    }
  }

  const library = kind.value === 'library'
  useEffect(() => { if (library) void loadReleases() }, [library])

  /** `quiet`: a timed look that leaves the "waiting" row as it is unless something changed. */
  async function track(quiet = false) {
    const asked = branch.value.trim()
    const scenario = kind.value
    const epoch = trackEpoch.value
    const branches = trackedBranches.value
    const key = branches?.join('|') ?? ''
    if (!asked || (branches && !branches.length)) return
    // An answer only counts for the hand-off it was asked about: same scenario, same branches, not started over since.
    const stale = () => trackEpoch.value !== epoch || kind.value !== scenario || branch.value.trim() !== asked || (trackedBranches.value?.join('|') ?? '') !== key
    if (!quiet) { trackPhase.value = 'checking'; trackError.value = null }
    try {
      const result = await rpc.call<TrackResult>(MSG.track, { scenario, branch: asked, ...(branches ? { branches } : {}) })
      if (stale()) return
      trackResult.value = result
      trackPhase.value = result.state === 'waiting' ? 'waiting' : 'found'
      // The "prompt copied" line has done its job once GitHub shows a pull request.
      if (result.state !== 'waiting' || result.pulls?.some((p) => p.state !== 'waiting')) notice.value = null
    } catch (e) {
      if (stale()) return
      // A timed look that fails says so too (the client already retried a flaky network): polling a dead token would wait forever.
      trackPhase.value = 'failed'
      trackError.value = e instanceof Error ? e.message : 'GitHub could not be reached'
    }
  }

  const waiting = step.value === 3 && trackPhase.value === 'waiting'
  useEffect(() => {
    if (!waiting) return undefined
    const id = setInterval(() => { void track(true) }, TRACK_EVERY_MS)
    return () => clearInterval(id)
  }, [waiting])

  return (
    <McpHandoff
      onOpenNode={(nodeId) => { rpc.call(MSG.focus, { nodeId }).catch(fail('Could not select that frame in Figma')) }}
      onOpenUrl={(url) => { rpc.call(MSG.open, { url }).catch(fail('Could not open that link')) }}
      onCheck={(nodeId) => { void check(nodeId) }}
      onUseSelection={() => { rpc.call<SelectionResult>(MSG.selection).then(applySelection).catch(fail('Could not read the selection')) }}
      onTrack={() => { void track() }}
      onReleases={() => { void loadReleases() }}
      onImpact={() => { void scanImpact() }}
    />
  )
}
