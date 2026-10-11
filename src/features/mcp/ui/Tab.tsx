import { useEffect } from 'preact/hooks'
import { useRpc } from '@shared/ui'
import { MSG } from '../messages'
import { notice, reset } from '../state'
import { McpHandoff } from './McpHandoff'

/** MCP handoff tab: Select → Check → Generate → Ship on fixtures (Figma "MCP flow v2 · 600"). */
export function Tab() {
  const rpc = useRpc()
  useEffect(() => () => reset(), [])

  const fail = (fallback: string) => (e: unknown) => { notice.value = e instanceof Error ? e.message : fallback }

  return (
    <McpHandoff
      onOpenNode={(nodeId) => { rpc.call(MSG.focus, { nodeId }).catch(fail('Could not select that frame in Figma')) }}
      onOpenUrl={(url) => { rpc.call(MSG.open, { url }).catch(fail('Could not open that link')) }}
    />
  )
}
