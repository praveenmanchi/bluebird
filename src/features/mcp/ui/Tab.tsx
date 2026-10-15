import { useEffect } from 'preact/hooks'
import { useRpc } from '@shared/ui'
import { MSG, type CheckResult, type McpStatus, type SelectionResult } from '../messages'
import {
  applySelection, applyStatus, checkError, checkPhase, checkResult, notice, reset, selection, selectionError, selectionPhase,
} from '../state'
import { McpHandoff } from './McpHandoff'

/** Checking walks the selection layer by layer; a large screen takes a few seconds. */
const CHECK_TIMEOUT_MS = 60_000

/**
 * MCP handoff tab: Select → Check → Generate → Ship (Figma "MCP flow v2 · 600").
 * The selection, the readiness checks and the GitHub connection come from the
 * sandbox and follow the canvas; Generate and Ship preview on fixtures.
 */
export function Tab() {
  const rpc = useRpc()

  const fail = (fallback: string) => (e: unknown) => { notice.value = e instanceof Error ? e.message : fallback }

  useEffect(() => {
    let live = 0
    selection.value = null
    selectionPhase.value = 'loading'
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

  return (
    <McpHandoff
      onOpenNode={(nodeId) => { rpc.call(MSG.focus, { nodeId }).catch(fail('Could not select that frame in Figma')) }}
      onOpenUrl={(url) => { rpc.call(MSG.open, { url }).catch(fail('Could not open that link')) }}
      onCheck={(nodeId) => { void check(nodeId) }}
      onUseSelection={() => { rpc.call<SelectionResult>(MSG.selection).then(applySelection).catch(fail('Could not read the selection')) }}
    />
  )
}
