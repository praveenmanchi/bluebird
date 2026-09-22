import { useEffect } from 'preact/hooks'
import { RpcProvider, EmptyState, Footer } from '@shared/ui'
import { applyTokens } from '@shared/brand'
import type { BrandTokensResult } from '@shared/brand'
import type { RpcClient, Transport } from '@shared/bridge'
import { features } from './registry.generated'
import { Banner } from './Banner'
import { TabBar } from './TabBar'
import { activeTabId, brandStatus, connection } from './state'

export interface AppProps { client: RpcClient; transport: Transport }

export function App({ client, transport }: AppProps) {
  useEffect(() => {
    const offStatus = transport.onStatus?.((s) => { connection.value = s })
    client.call<BrandTokensResult>('brand:tokens')
      .then((result) => { brandStatus.value = result; applyTokens(result.tokens) })
      .catch((error: unknown) => {
        brandStatus.value = { brandId: 'unknown', source: 'fallback', tokens: {}, note: `Brand tokens unavailable: ${error instanceof Error ? error.message : 'unknown error'}` }
      })
    return () => offStatus?.()
  }, [client, transport])

  const entry = features.find((f) => f.manifest.id === activeTabId.value)

  return (
    <RpcProvider client={client}>
      <div class="h-full flex flex-col bb-canvas">
        <Banner />
        <TabBar />
        <main class="flex-1 min-h-0 overflow-y-auto">
          {entry
            ? <entry.Tab key={entry.manifest.id} />
            : <EmptyState icon="◌" title="No tabs enabled" description="Enable a tab for this persona in plugin.config.json and rebuild." />}
        </main>
        <Footer />
      </div>
    </RpcProvider>
  )
}
