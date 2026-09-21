import { createContext } from 'preact'
import { useContext } from 'preact/hooks'
import type { ComponentChildren } from 'preact'
import type { RpcClient } from '../bridge/ui-client'

const RpcContext = createContext<RpcClient | null>(null)

export function RpcProvider({ client, children }: { client: RpcClient; children: ComponentChildren }) {
  return <RpcContext.Provider value={client}>{children}</RpcContext.Provider>
}

/** The bridge client for the current mode (Figma, live, or mock). Tabs never construct their own. */
export function useRpc(): RpcClient {
  const client = useContext(RpcContext)
  if (!client) throw new Error('useRpc must be used inside <RpcProvider>')
  return client
}
