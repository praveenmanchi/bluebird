import { useEffect, useMemo, useRef } from 'preact/hooks'
import { RpcProvider, EmptyState, Footer, ICONS, type IconName } from '@shared/ui'
import type { BrandId } from '@shared/brand'
import type { RpcClient, Transport } from '@shared/bridge'
import { features } from './registry.generated'
import { Banner } from './Banner'
import { TabBar } from './TabBar'
import { activePersonaId, activeTabId, brandPersonas, brandStatus, changingPersona, connection, screen, selectTab, session, visibleTabs, windowSize } from './state'
import { LoginScreen } from './LoginScreen'
import { SettingsScreen } from './SettingsScreen'
import { OnboardingScreen } from './OnboardingScreen'
import { SplashScreen } from './SplashScreen'
import { PersonaScreen } from './PersonaScreen'
import { bootSession, cancelPersonaChange, changePersona, choosePersona, completeOnboarding, login, loginWithSso, logout, replayOnboarding, reset } from './session'
import { integrationsApi } from './integrations/client'
import { DEFAULT_INTEGRATIONS } from '@shared/integrations'
import { WINDOW_PRESETS, WINDOW_MAX, WINDOW_DEFAULT, clampWindow, presetFor, type WindowPreset, type WindowSize } from '@shared/config'
import { OPEN_SETTINGS_EVENT, OPEN_TAB_EVENT } from '@shared/navigation'
import { ensureLibraryState, libraryPill, libraryState, loadLibraryState } from '@shared/libraries/status'
import { gitPill, integrationSettings, mcpPill, uxaiPill } from './footerStatus'

export interface AppProps { client: RpcClient; transport: Transport }

const isIconName = (name: string): name is IconName => name in ICONS

export function App({ client, transport }: AppProps) {
  useEffect(() => {
    const offStatus = transport.onStatus?.((s) => { connection.value = s })
    void bootSession(client)
    return () => offStatus?.()
  }, [client, transport])

  // A tab asked for Settings (e.g. Jira's "Connect Jira"); only once signed in.
  useEffect(() => {
    const open = () => { if (screen.value === 'app') screen.value = 'settings' }
    window.addEventListener(OPEN_SETTINGS_EVENT, open)
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, open)
  }, [])

  // A tab sent the person to another tab (e.g. Audit's "Fix these in Variable mapper").
  useEffect(() => {
    const open = (e: Event) => { selectTab((e as CustomEvent<string>).detail) }
    window.addEventListener(OPEN_TAB_EVENT, open)
    return () => window.removeEventListener(OPEN_TAB_EVENT, open)
  }, [])

  // The footer's Dual File pill reports the library connection: read once signed in, again after a Dual File save.
  const signedIn = screen.value === 'app' || screen.value === 'settings'
  useEffect(() => { if (signedIn) ensureLibraryState(client) }, [client, signedIn])

  const integrations = useMemo(() => {
    const api = integrationsApi(client)
    return {
      ...api,
      // A save updates the footer pills that read Settings (UX AI, MCP) and reconnects Dual File.
      save: async (...args: Parameters<typeof api.save>) => {
        const saved = await api.save(...args)
        const [section] = args
        if (integrationSettings.value) integrationSettings.value = { ...integrationSettings.value, [section]: saved }
        if (section === 'dualFile') void loadLibraryState(client)
        return saved
      },
    }
  }, [client])

  // The UX AI and MCP pills read their Settings sections; read them once signed in.
  // Signing out (or Reset, which wipes Settings) forgets them, so the next sign-in reads them afresh.
  useEffect(() => {
    if (!signedIn) { integrationSettings.value = null; return }
    if (integrationSettings.value) return
    // Unreadable Settings read as the defaults: the pills then say what to set up instead of loading forever.
    integrations.load().then((s) => { integrationSettings.value = s }, () => { integrationSettings.value = DEFAULT_INTEGRATIONS })
  }, [integrations, signedIn])
  const pillSettings = integrationSettings.value
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
    if (isMax) { resize(beforeExpand.current ?? WINDOW_PRESETS[WINDOW_DEFAULT]); beforeExpand.current = null; return }
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
          <LoginScreen onSubmit={(code, accepted) => login(client, code, accepted)} onSso={loginWithSso} />
        </div>
      </RpcProvider>
    )
  }
  if (current === 'splash' || current === 'persona') {
    const brand = session.value?.brandId as BrandId | undefined
    const fromSettings = changingPersona.value
    return (
      <div class="h-full flex flex-col bb-canvas">
        {current === 'splash'
          ? <SplashScreen brand={brand} onDone={() => { screen.value = 'persona' }} />
          : <PersonaScreen personas={brandPersonas.value} brand={brand} intro={!fromSettings} initialId={fromSettings ? activePersonaId.value : null} onCancel={fromSettings ? cancelPersonaChange : undefined} onConfirm={(id) => { void choosePersona(client, id) }} />}
      </div>
    )
  }
  if (current === 'onboarding') {
    const tabs = visibleTabs.value.map((t) => ({ id: t.id, label: t.label, icon: isIconName(t.icon) ? t.icon : 'variables' as const }))
    return (
      <RpcProvider client={client}>
        <div class="h-full flex flex-col bb-canvas">
          <OnboardingScreen tabs={tabs} brand={session.value?.brandId as BrandId | undefined} onFinish={(skipped) => { void completeOnboarding(client, skipped) }} />
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
            ? <SettingsScreen session={session.value} brand={brandStatus.value} onLogout={() => logout(client)} onReset={() => reset(client)} personas={brandPersonas.value} personaId={activePersonaId.value} onChangePersona={changePersona} integrations={integrations} onReplayTour={replayOnboarding} />
            : entry
              ? <entry.Tab key={entry.manifest.id} />
              : <EmptyState icon="inspect" title="No tabs enabled" description="Turn a tab on for this brand in dev.html › Plugin configuration (or plugin.config.json) and rebuild." />}
        </main>
        <Footer size={presetFor(size)} onSizeChange={onPreset} expanded={isMax} onExpand={onExpand} onResizeDrag={onResizeDrag} git={!inSettings} uxai={!inSettings} mcp={!inSettings} dualFile={!inSettings} statuses={{ git: gitPill(pillSettings?.github), uxai: uxaiPill(pillSettings?.ai), mcp: mcpPill(pillSettings?.mcp), dualFile: libraryPill(libraryState.value) }} />
      </div>
    </RpcProvider>
  )
}
