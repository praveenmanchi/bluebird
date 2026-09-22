import { useEffect, useRef } from 'preact/hooks'
import { RpcProvider, EmptyState, Footer } from '@shared/ui'
import type { RpcClient, Transport } from '@shared/bridge'
import { features } from './registry.generated'
import { Banner } from './Banner'
import { TabBar } from './TabBar'
import { activeTabId, brandStatus, connection, screen, session, windowSize } from './state'
import { LoginScreen } from './LoginScreen'
import { SettingsScreen } from './SettingsScreen'
import { bootSession, login, logout, reset } from './session'
import { WINDOW_PRESETS, WINDOW_MAX, clampWindow, presetFor, type WindowPreset, type WindowSize } from '@shared/config'

export interface AppProps { client: RpcClient; transport: Transport }

export function App({ client, transport }: AppProps) {
  useEffect(() => {
    const offStatus = transport.onStatus?.((s) => { connection.value = s })
    void bootSession(client)
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

  const current = screen.value
  if (current === 'boot') return <div class="h-full bb-canvas" aria-busy="true" />
  if (current === 'login') {
    return (
      <RpcProvider client={client}>
        <div class="h-full flex flex-col bb-canvas">
          <LoginScreen onSubmit={(code) => login(client, code)} />
        </div>
      </RpcProvider>
    )
  }
  const inSettings = current === 'settings'
  return (
    <RpcProvider client={client}>
      <div class="h-full flex flex-col bb-canvas">
        <Banner />
        <TabBar settingsActive={inSettings} onSettings={() => { screen.value = inSettings ? 'app' : 'settings' }} onTab={() => { if (inSettings) screen.value = 'app' }} />
        <main class="flex-1 min-h-0 overflow-y-auto">
          {inSettings
            ? <SettingsScreen session={session.value} brand={brandStatus.value} onLogout={() => logout(client)} onReset={() => reset(client)} />
            : entry
              ? <entry.Tab key={entry.manifest.id} />
              : <EmptyState icon="inspect" title="No tabs enabled" description="Enable a tab for this persona in plugin.config.json and rebuild." />}
        </main>
        <Footer size={presetFor(size)} onSizeChange={onPreset} expanded={isMax} onExpand={onExpand} onResizeDrag={onResizeDrag} local={!inSettings} uxai={!inSettings} mcp={!inSettings} dualFile={!inSettings} />
      </div>
    </RpcProvider>
  )
}
