import { useEffect, useRef } from 'preact/hooks'
import { RpcProvider, EmptyState, Footer } from '@shared/ui'
import { applyTokens } from '@shared/brand'
import type { BrandTokensResult } from '@shared/brand'
import type { RpcClient, Transport } from '@shared/bridge'
import { features } from './registry.generated'
import { Banner } from './Banner'
import { TabBar } from './TabBar'
import { activeTabId, brandStatus, connection, windowSize } from './state'
import { WINDOW_PRESETS, WINDOW_MAX, clampWindow, presetFor, type WindowPreset, type WindowSize } from '@shared/config'

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

  const beforeExpand = useRef<WindowSize | null>(null)
  const dragStart = useRef<WindowSize | null>(null)
  const size = windowSize.value
  const isMax = size.width === WINDOW_MAX.width && size.height === WINDOW_MAX.height

  function resize(next: WindowSize) {
    const clamped = clampWindow(next)
    if (clamped.width === windowSize.value.width && clamped.height === windowSize.value.height) return
    windowSize.value = clamped
    void client.call('shell:resize', clamped).catch(() => undefined)
  }
  const onPreset = (preset: WindowPreset) => { beforeExpand.current = null; resize(WINDOW_PRESETS[preset]) }
  const onExpand = () => {
    if (isMax) { resize(beforeExpand.current ?? WINDOW_PRESETS.S); beforeExpand.current = null; return }
    beforeExpand.current = size
    resize(WINDOW_MAX)
  }
  const onResizeDrag = (delta: { dx: number; dy: number }, phase: 'move' | 'end') => {
    dragStart.current ??= size
    resize({ width: dragStart.current.width + delta.dx, height: dragStart.current.height + delta.dy })
    if (phase === 'end') dragStart.current = null
  }

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
        <Footer size={presetFor(size)} onSizeChange={onPreset} expanded={isMax} onExpand={onExpand} onResizeDrag={onResizeDrag} />
      </div>
    </RpcProvider>
  )
}
